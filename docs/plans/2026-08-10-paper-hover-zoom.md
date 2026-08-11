# 纸片 Hover Zoom 实现计划（方案 B）

- **日期**：2026-08-10
- **状态**：需求已确认，按计划执行
- **范围**：`frontend/src/three/`（CameraKeyframes、Camera、World、Application、新增 PaperPointerTracker、sources）+ 测试
- **关联**：`docs/plans/2026-08-03-next-migration-and-seo.md`（3D 桌面模式）

---

## 0. 已确认的需求与决策

1. **交互语义**（复刻电脑屏幕）：鼠标 hover 到纸片区域 → 相机 zoom 到纸片（进入后**粘滞**，移开不退出）；**点击纸片外部**才退出（点纸片本身 = 无操作）。
2. **检测方案**：用户选定 **方案 B** —— 直接对 `decor.glb` 的 `paper` 网格做 Raycaster 求交，不建命中盒。
3. **观察方向**（由几何数据确认）：纸片 4 顶点 y 恒为 -0.494（×900 缩放 = -444.6），位于 xz 平面内，法线为 ±y。故"垂直往下"= 视线沿 **-y 轴**（相机在纸片正上方）。用户口中的"对着 z 轴"不成立（monitor 才面向 +z）。
4. **lookAt NaN 规避（A2）**：视线与 up(0,1,0) 平行时 three.js 的 lookAt 会产出 NaN。相机加 **1.1° 水平偏移**（`PAPER_VIEW_TILT = (50, 0, 0)`，距离 2600 时约 1.1°），视觉上不可察觉，且不触碰 up 向量、无任何滚转跳变副作用。
5. **关键事实（CSS）**：`.public-webgl-mount` / `.public-scene-canvas` 均为 `pointer-events: none`，canvas **收不到**鼠标事件，事件落在 CSS3D 容器（`.public-css-mount`）上。故 NDC 计算用 `canvas.getBoundingClientRect()`（canvas 为 `position: fixed; inset: 0`，矩形 = 视口），并以"事件目标是否在 monitor host 内"判定独占区。
6. **点击冲突**：monitor 的 `MonitorPointerTracker` 对 host 外任何 pointerdown 都会 `toggleDeskView()`。纸片 hover 时点击必须被**吞掉**（`stopImmediatePropagation`），且 PaperPointerTracker 的 document 监听必须**先注册**（Application.start 顺序）才能抢在 monitor 之前。PaperPointerTracker 自身**永不调用** `toggleDeskView`（该职责仍归 monitor）。
7. **纸片坐标**（世界坐标，GLB × 900）：中心 `(-2063.7, -444.6, 986.4)`，尺寸约 `1017 × 1074.6`。相机距离 2600 时纸片约占画面高度 65%（fov 35°）。运行时由 World 从加载后的网格实测（`updateWorldMatrix` + `computeBoundingBox`）更新相机目标，GLB 改版不失效；默认常量仅作兜底。
8. **不做**：hover 离开自动退出；纸片飞向相机的动画（另案，tween paper 网格的 `position.y` 即可，与相机 zoom 相互独立）。

---

## Task 1：CameraKeyframes / Camera 增加 paper 视角

**涉及文件**：`frontend/src/three/CameraKeyframes.ts`、`frontend/src/three/Camera.ts`

**改动**：

1. `CameraKeyframes.ts`
   - `CameraKey` 联合类型追加 `'paper'`。
   - 导出常量：`PAPER_CENTER = (-2063.7, -444.6, 986.4)`、`PAPER_VIEW_DISTANCE = 2600`、`PAPER_VIEW_TILT = (50, 0, 0)`。
   - 新增静态 `paper` frame：`position = PAPER_CENTER + PAPER_VIEW_TILT + (0, PAPER_VIEW_DISTANCE, 0)`，`focalPoint = PAPER_CENTER`。
2. `Camera.ts`
   - 新增 `enterPaper()`：`transition('paper', 2000, BezierEasing(0.13, 0.99, 0, 1))`，与 `enterMonitor()` 手感一致。
   - 新增 `setPaperTarget(center: THREE.Vector3)`：把 `keyframes.paper.focalPoint` 设为 center、`position` 设为 center + TILT + (0, DISTANCE, 0)。供 World 在 decor 加载后传入实测中心。

**验收**：TS 编译通过（`Record<CameraKey, CameraFrame>` 穷尽性由类型保证）；`enterPaper` 调用 `transition('paper', …)`；`setPaperTarget` 正确改写 paper frame。

---

## Task 2：World 暴露 paper 网格并设置相机目标

**涉及文件**：`frontend/src/three/sources.ts`、`frontend/src/three/World.ts`

**改动**：

1. `sources.ts`：新增 `export const DECOR_MODEL_NAME = 'decorModel' as const;`（与 `COMPUTER_MODEL_NAME` 同模式）。
2. `World.ts`
   - 字段 `private paperMesh: THREE.Mesh | null = null`。
   - `handleModel`：`else if (source.name === DECOR_MODEL_NAME)` 分支调用 `attachPaper(model.object)`（在 monitor 分支之后）。
   - `attachPaper(group)`：`getObjectByName('paper')`；非 `THREE.Mesh` 实例则置 null 返回（优雅降级，模型改名/缺节点不崩溃）。否则 `geometry.computeBoundingBox()`、`mesh.updateWorldMatrix(true, false)`、`box.applyMatrix4(matrixWorld)`，取 `getCenter()` 调 `camera.setPaperTarget(center)`。
   - 新增 `getPaperMesh(): THREE.Mesh | null`。
   - `destroy()`：`paperMesh = null`。

**验收**：decor 加载后 `getPaperMesh()` 返回该网格；`setPaperTarget` 收到含 900 缩放的世界中心；无 paper 节点时全部降级；destroy 后返回 null。

---

## Task 3：新建 PaperPointerTracker

**涉及文件**：`frontend/src/three/PaperPointerTracker.ts`（新文件）

**改动**（镜像 `MonitorPointerTracker` 结构）：

- 构造：`(documentTarget: Document, host: HTMLElement, canvas: HTMLCanvasElement, camera: Camera, getPaper: () => THREE.Mesh | null)`。持有单个 `Raycaster` 复用。
- `start()` / `destroy()`：document 上注册/移除 `pointermove`、`pointerdown`（幂等，同 monitor tracker 模式）。
- `onPointerMove`：
  1. 目标在 host 内 → `setHovering(false)` 返回（monitor 独占区）。
  2. 无网格 / `canvas.getBoundingClientRect()` 宽高为 0 → `setHovering(false)` 返回。
  3. clientX/Y → NDC（`((x-left)/width)*2-1`、`-((y-top)/height)*2+1`）→ `raycaster.setFromCamera(ndc, camera.instance)` → `paper.updateWorldMatrix(true, false)` → `intersectObject(paper, false)` 非空即命中 → `setHovering(hit)`。
- `onPointerDown`：目标在 host 内 → 返回；`hovering` 为真 → `event.stopImmediatePropagation()` 吞掉点击（阻止后注册的 monitor tracker 触发 toggle）；其余情况一律不处理。
- `setHovering(next)`：仅上升沿调 `camera.enterPaper()`（去抖，配合 Camera.transition 的 current/target 守卫）。
- **不调用** `mouse.update` / `toggleDeskView`（monitor 负责）。

**验收**：hover 进入只触发一次 `enterPaper`；点击纸片被吞（后续注册的 document 监听不触发）；host 内、无网格、零尺寸 rect 均安全；destroy 后监听移除。

---

## Task 4：Application 接线 + 注册顺序

**涉及文件**：`frontend/src/three/Application.ts`

**改动**：

- 构造中新增 `paperPointerTracker`：`new PaperPointerTracker(document, options.screenHost, this.renderer.webgl.domElement, this.camera, () => this.world.getPaperMesh())`。
- `start()`：**先** `this.paperPointerTracker.start()` 再 `this.pointerTracker.start()`（保证 pointerdown 时 paper 先收到事件，才能 stopImmediatePropagation 阻断 monitor）。
- `destroy()`：对称销毁（顺序无关紧要，监听各自移除）。

**验收**：注册顺序正确；start/destroy 无泄漏。

---

## Task 5：测试

**涉及文件**：`frontend/src/three/PaperPointerTracker.test.ts`（新）、`frontend/src/three/World.test.ts`

**改动**：

1. `PaperPointerTracker.test.ts`（jsdom）：
   - jsdom 无布局，需 stub `canvas.getBoundingClientRect` 返回固定 100×100 矩形。
   - 场景：相机在纸片正上方 `(0, 100, 0)` 俯视，纸片为 `PlaneGeometry(40, 40)` 水平放置于 `(0, -10, 0)`（fov 35° 下 NDC(0,0) 命中、NDC(-1,1) 不命中）。
   - 用例：中心 pointermove → `enterPaper` 恰 1 次且重复移动不重复调用；移出后移回再次进入；hover 时 pointerdown → `stopImmediatePropagation`（用后注册的 document 监听验证不被调用）且不调 `toggleDeskView`；host 内 pointerdown 不吞；destroy 后无监听。
2. `World.test.ts`：
   - camera mock 补 `setPaperTarget: vi.fn()`。
   - 新用例：decor 模型含名为 `paper` 的网格（`position.set(1,2,3)`）→ `getPaperMesh()` 返回它、`setPaperTarget` 收到 `(1,2,3)`；无 paper 节点 → 降级且不调 `setPaperTarget`。

**验收**：`npm run test:run` 全绿（含既有用例）；`npm run lint` 通过。

---

## 执行顺序

T1 → T2 → T3 → T4 → T5（T1 的 CameraKeyframes 部分已先行应用；T2 依赖 T1 的 `setPaperTarget`；T4 依赖 T2/T3；T5 最后统一验证）。
