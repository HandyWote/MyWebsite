# 纸面绘图游戏 P0 实施子计划（画板）

- **日期**：2026-08-14
- **状态**：需求已确认，等待批准后实施
- **范围**：`frontend/src/games/`（注册表、宿主契约、画板游戏）、`frontend/app/(public)/games/`（大厅与游戏页）、`frontend/src/components/public/PublicExperience.tsx`（路由驱动纸面挂载）
- **关联**：主计划 [2026-08-12-paper-drawing-game-p0.md](./2026-08-12-paper-drawing-game-p0.md)（Task 1-7，本文档为其实施细化）；前置 P1 登录体系已合并（PR #5，main 分支）
- **基线核对**（与总计划写作时的差异）：`#paper-screen-host` 容器已由 `PublicExperience` 常驻、`World` 已接管（`paperHost` 传入），集成点就绪；**`frontend/src/three/` 下不存在 GameCenter 预留接口与纸堆就绪信号**——总计划范围中的该部分收敛为本计划 G5（纯类型，放 `src/games/`），不再动 three 运行时

---

## 1. 范围划定

### 做（本次实施）

| ID | 内容 | 来源 |
|---|---|---|
| G1 | 游戏注册表 `registry.ts` + 类型 `types.ts`（drawing 注册、getGame/getDefaultGame） | 总 Task 1 |
| G2 | 宿主契约 `host.ts` + `PublicExperience` 路由集成（`/games/[id]` 驱动纸面挂载/卸载） | 总 Task 2 |
| G3 | `/games` 大厅页 + `/games/[id]` 骨架（一页两用、未知 id 404） | 总 Task 3/4 |
| G4 | 画板游戏本体：`DrawingGame.tsx` + `drawingCanvas.ts`（笔画模型/渲染）+ `draftStore.ts`（localStorage 草稿） | 总 Task 5 |
| G5 | `GameCenterApi`/`GameCenterCallbacks` 纯类型（`gameCenter.ts`，M3D 空实现不报错） | 总 Task 6 |
| G6 | 测试：Vitest（registry/画布/草稿/挂载逻辑）+ Playwright e2e（`games-routes.spec.ts`） | 总 Task 7 |

### 不做（明确排除，避免范围蔓延）

- **后端零改动**：无上传接口、无数据库、无审核；画板"提交"按钮为禁用占位
- **公共画布与审核链**（P1 后续）：多人接力、版本化、乐观锁、TextDetector/ASCII 栅格化/OCR 全部不做
- **M3D 纸堆交互**：不做抽卡动画，GameCenter 仅类型
- **查看模式内容**：`/games/[id]` 非桌面 DetailView 仅占位
- **多游戏**：注册表结构支持多游戏，但本次只实现 drawing 一个
- **/members、评论账号化、S3 base64**（P2/P3/S3 项）

## 2. 技术要点（冻结）

1. **笔画模型**（与 P1 上传契约一致，现在定死）：
   ```ts
   interface Stroke {
     id: string;
     color: string;
     width: number; // 相对笔宽（0-1）
     points: Array<{ x: number; y: number; t: number }>; // 坐标 0-1 相对值，t 时间戳(ms)
   }
   type Drawing = { strokes: Stroke[] };
   ```
   实施补记：橡皮笔画以哨兵色 `ERASER_COLOR = "__eraser__"` 存于 `stroke.color`（渲染时 destination-out）；P1 上传契约需约定该哨兵的识别与序列化。
2. **宿主契约**：`mount(element)` / `unmount()` / `getSize()`（L1×L2 CSS 像素）。CSS3DObject 的 DOM transform 已自动处理坐标，游戏内 pointer 事件即纸面本地坐标，无需三维↔二维换算。
3. **PublicExperience 集成**：`usePathname()` 解析 `/games/[id]`；命中注册表创建 host 并挂载 `GameView`，未命中挂默认游戏（drawing）；`desktop-ready` 就绪前不挂载（沿用现有模式状态机）；**路由切换不重建 3D 场景**，仅重挂纸面内容；切出游戏路由卸载。纸面容器 `#paper-screen-host` 常驻，`PaperScreen` 接管 transform 的机制不变。
4. **画板渲染**：`<canvas>` 铺满 host（`getSize()` × devicePixelRatio），2D context 渲染；host resize 时重绘。笔刷：6-8 色板 + 2-3 级粗细 + 橡皮（覆盖模式）。撤销/重做栈、清空。
5. **草稿**：localStorage key `game:drawing:draft`，绘制防抖自动保存；进入时有草稿提示"继续上次/新画"；路由切换/刷新后恢复。
6. **路由一页两用**：`/games/[id]/page.tsx` 渲染游戏说明（桌面 monitor 内）+ DetailView 占位（非桌面）；纸面挂载由 PublicExperience 按路由处理，页面组件不感知。

## 3. 任务拆分

| ID | 任务 | 依赖 |
|---|---|---|
| G1 | registry + types（drawing 注册、查询函数、TS 穷尽） | — |
| G2 | host.ts 契约 + PublicExperience 路由挂载/卸载 + 模式状态机衔接 | G1 |
| G3 | /games 大厅（注册表驱动卡片）+ /games/[id] 骨架（说明/占位/404）+ layout | G1 |
| G4 | 画板本体：drawingCanvas（笔画/渲染/重绘）、DrawingGame（笔刷/撤销/清空）、draftStore（草稿） | G2 |
| G5 | gameCenter.ts 纯类型 + PublicExperience/World 空实现不报错 | G1 |
| G6 | Vitest 单测 + e2e games-routes.spec.ts + 既有探针回归 | G2, G3, G4, G5 |

## 4. 实施顺序与并行

```
第一批（无依赖，文件互不重叠）：G1
第二批（均只依赖 G1）：G2 | G3 | G5
第三批：G4（←G2）
收尾：G6
```

冲突注意：G2 独占 `PublicExperience.tsx`；G3 独占 `app/(public)/games/`；G4 独占 `src/games/drawing/`；G5 独占 `src/games/gameCenter.ts`。

## 5. 全局验收（完成定义）

1. 桌面 3D 纸面上可画、可擦、可撤销、可重做、可清空；刷新不丢草稿；切路由回来草稿仍在
2. `/games` 大厅由注册表驱动（新增游戏自动出现）；`/games/drawing` 桌面挂纸面画板、非桌面出查看占位；未知 id 404
3. 路由切换不重建 3D 场景（观察无闪烁/重载），纸面内容正确卸载/挂载
4. 笔画以 0-1 相对坐标存储，结构与 P1 上传契约一致；草稿命名空间 `game:drawing:draft`
5. 提交按钮为禁用占位；无任何后端请求
6. `npm run test:run`、`npm run lint`、`npm run build`、`npm run test:e2e` 全绿；既有 `paper-layer-probe.spec.ts` 不受影响（层拓扑不变）

## 6. 环境与部署

- 纯前端改动，无新环境变量、无迁移、无部署配置变更
- 分支建议：`feat/p0-drawing-game`；完成后按 P1 流程 tea PR 合 main
