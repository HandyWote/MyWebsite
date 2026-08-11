# 纸片视角「转正」方案（per-keyframe up 向量）

- **日期**：2026-08-10
- **状态**：方案确认中，待批准后执行
- **目标**：保持纸片在世界中的原摆放（GLB/其他视角不变），仅让 paper 特写视角下纸片内容"正立"（不再斜 36°）
- **关联**：`docs/plans/2026-08-10-paper-hover-zoom.md`

---

## 1. 问题根源（已核实）

纸片在 `decor.glb` 中是不规则斜四边形（4 顶点在 xz 平面）：

```
A=(-2.290,-0.494,1.693)  B=(-2.858,-0.494,0.904)
C=(-1.728,-0.494,1.288)  D=(-2.296,-0.494,0.499)
```

- 长边 AB/CD 与世界 z 轴成 **35.8°**；边 BC 与 z 轴 71.2°
- UV（TEXCOORD_0）是轴对齐矩形：u∈[0.0138,0.4829], v∈[0.0325,0.6901]，**v 方向对应几何 B→A 方向**（即内容"上方向" = 世界方向 (0.568, 0, 0.789) ≈ 与 z 轴 35.8°）
- 当前相机 up=(0,1,0) 固定，`lookAt` 只负责"看向纸片"，**不负责画面正不正** → 垂直俯视一个斜 36° 的四边形 → 纸片在屏幕上斜 35.8°，内容横躺 → 用户看到"乱的"

## 2. 实现原理

### 2.1 用 up 向量控制滚转（roll）

three.js `lookAt(eye, target, up)` 中，up 决定相机滚转：

```
z = normalize(eye - target)          // 相机局部 -z = 视线方向
x = normalize(cross(up, z))          // 屏幕右
y = cross(z, x)                      // 屏幕上
```

**要让纸片内容方向 D 在屏幕上竖直 ⟺ D·x = 0**。由标量三重积恒等式：

```
D·(up × z) = up·(z × D) = 0  ⟺  up ⊥ (z × D)
```

即 up 必须落在 z 和 D 张成的平面内。**满足条件且不与 z 平行（避免 lookAt 退化）的自然取法：**

```
ẑ = normalize(eye - target)
up = normalize(D − (D·ẑ)·ẑ)     // D 在屏幕平面内的投影，归一化
```

此时屏幕上方向 ≈ up，D 完全沿屏幕竖直方向 → **纸片内容正立**（若渲染发现内容倒置，对 D 取反即可，见 §6）。

### 2.2 up 在飞行中平滑过渡

`transition()` 目前只 tween position 与 focalPoint。方案给 Camera 增加第三个 tween：**up 从当前值 lerp 到目标 frame 的 up，每帧 normalize**（两单位向量 lerp 的最小长度 ≈ cos(Δ/2)，滚转 90° 时 ≈ 0.707，无零长风险）。非 paper 视角的 frame up 恒为 (0,1,0)，**其他视角行为完全不变**。

### 2.3 内容上方向 D 的通用算法（不写死模型数据）

`World.attachPaper` 从网格数据自动提取：

1. 读 position 与 TEXCOORD_0（4 顶点）
2. 找 v 值最大与最小的两个顶点，`D_geo = pos(v_max) − pos(v_min)`（内容"上"的几何方向）
3. 经 `matrixWorld` 变换到世界方向并归一化 → 传给 `camera.setPaperTarget(center, D)`

若网格无 TEXCOORD_0（兜底）：取几何上最长边的方向。

### 2.4 数学验证（当前模型数值）

- ẑ = normalize((50, 2600, 0)) ≈ (0.0192, 0.9998, 0)
- D = normalize((0.568, 0, 0.789)) ≈ (0.584, 0, 0.811)
- up = normalize(D⊥) ≈ (0.584, −0.011, 0.811)；验证 up·ẑ ≈ 0（不退化）、D·x = 0（D 屏幕竖直）✓

**观感影响**：up 从 (0,1,0) 转到新值 ≈ 90.6° 的滚转，飞行中画面会滚转约 90° + 原有 66° 视线转向。这是"纸转正"的必要代价；若观感突兀，可联动 §5 的"先转后移"把旋转集中到飞行前段。

---

## 3. 实现步骤

### S1. `CameraKeyframes.ts`

- `CameraFrame` 类型增加 `up: THREE.Vector3`；`frame()` 工厂默认 `new THREE.Vector3(0, 1, 0)`（clone，避免共享）
- paper frame 不额外设置（初始 (0,1,0)，由 setPaperTarget 运行时写入）

### S2. `Camera.ts`

1. 新增私有字段 `private readonly up = new THREE.Vector3(0, 1, 0);`
2. `setPaperTarget(center: THREE.Vector3, contentUp: THREE.Vector3)`：
   - 现有 position/focalPoint 计算不变
   - 新增 up 计算：

     ```ts
     const zHat = frame.position.clone().sub(frame.focalPoint).normalize();
     const projected = contentUp.clone().sub(zHat.clone().multiplyScalar(contentUp.dot(zHat)));
     frame.up.copy(projected.lengthSq() > 1e-8 ? projected.normalize() : new THREE.Vector3(0, 0, 1));
     ```

3. `transition()`：第三个 tween（与 position/focalPoint 同 duration/easing）：

   ```ts
   new Tween(this.up, this.tweens)
     .to({ x: destination.up.x, y: destination.up.y, z: destination.up.z }, duration)
     .easing(easing)
     .onUpdate(() => this.up.normalize())
     .start();
   ```

4. `update()`：
   - `if (this.current)` 分支内加 `this.up.copy(this.keyframes[this.current].up);`
   - `this.instance.lookAt(this.focalPoint);` 之前加 `this.instance.up.copy(this.up);`
5. `stopTransitionTweens()` 同步停止 up tween（新增 `upTween` 字段）

### S3. `World.ts`

- `attachPaper` 增加内容方向提取（§2.3 算法，用 `mesh.geometry.attributes.position` 与 `TEXCOORD_0`，无则用最长边兜底），调用 `this.camera.setPaperTarget(center, contentUp)`
- 若最终截图确认内容倒置：对 contentUp 取反（一处改动）

### S4. 测试

- `World.test.ts`：camera mock 的 `setPaperTarget` 断言收到内容方向；无 UV 网格走兜底
- 新增 `Camera` 数学断言（放 `lifecycle.test.ts` 或新文件）：给定 center/contentUp，`setPaperTarget` 后 up 满足 up·ẑ ≈ 0 且 D·screenRight = 0（用 lookAt 结果验证）
- 全量 `npm run test:run` + `npm run lint` + `npm run typecheck`

### S5. 运行验证（人工）

- `npm run dev` → hover 纸片 → 确认：① 纸片内容在特写视角正立；② 飞行中滚转平滑；③ 倒置则取反 contentUp；④ idle/desk/monitor 视角无变化

---

## 4. 验收标准

1. paper 特写视角下纸片内容正立（不再斜 36°），纸片原摆放/其他视角不变
2. 飞行中无滚转跳变（up 插值平滑）
3. 所有既有测试 + 新增测试全绿；lint/typecheck 通过
4. 无 paper 网格 / 无 UV 时优雅降级（up 保持 (0,1,0)）

## 5. 可选联动（不包含在本方案，需单独确认）

- **"先转后移"**：up 与 focalPoint 用快缓动（前 ~0.6s 完成 90° 滚转 + 66° 转向），position 用慢缓动（后段纯俯冲）→ 消除"zoom 完成仍在旋转"的观感（用户此前抱怨的现象）

## 6. 风险与调试点

| 风险 | 处理 |
| --- | --- |
| 纹理内容方向假设（v+ = 内容上）不成立 → 内容倒置 | 截图确认，contentUp 取反（S3 一行） |
| up 插值引入 ~90° 滚转，飞行观感变化 | 接受；或联动 §5 集中到前段 |
| `setPaperTarget` 签名变更影响 World.test mock | 同步更新 |
