# 纸面绘图小游戏 P0 实现计划

- **日期**：2026-08-12
- **状态**：头脑风暴已收敛，需求已确认，按计划执行
- **范围**：`frontend/src/games/`（注册表、宿主契约、画板游戏）、`frontend/app/(public)/games/`（大厅与游戏页骨架）、`frontend/src/three/`（GameCenter 预留接口、World 纸堆就绪信号）
- **关联**：`fce9e34`（paper overlay 独立 CSS3D 层，即 z3 透明遮罩）；后续 P1（login 命令体系 + 公共画布 + 审核链）、M3D（纸堆游戏中心交互）以此为基座

---

## 0. 背景与已冻结的决策

**产品愿景**：博客桌面 3D 场景的纸面上承载小游戏。第一个游戏是**画板**：访客可在纸上写画，登录用户可将笔迹上传到**单幅公共画布**（多人接力，r/place 式），所有人可见。未来会有多个游戏，通过场景内"空白纸堆"交互切换。

头脑风暴已确认的决策（后续计划以本清单为准）：

1. **代码位置**：不单独建仓。游戏代码放本仓库 `frontend/src/games/`，与遮罩层同仓库共享 e2e/CI/部署；游戏只依赖宿主契约，不依赖 three 内部实现，未来可平移。
2. **路由形态**（一页两用）：`/games` = 游戏大厅（DOM 列表，非桌面/无 3D 的 fallback + SEO 入口）；`/games/[id]` = 游戏页，桌面端挂载到纸面（monitor 显示说明），非桌面端直接渲染"查看模式"。不另做 `/drawings` 分享页，画布的查看模式就是 `/games/drawing` 的非桌面渲染。
3. **游戏中心交互（M3D，冻结稿 v2.0）**：主纸面（一张纸）+ 空白纸堆。点击纸堆 → 从空白纸堆抽出 N 张空白纸（N = 游戏注册数）→ 摊开悬浮正对摄像机 → 落定后每张纸浮现游戏效果图 → 悬停放大、点击确认 → 其余纸收回 → 选中纸飞向主纸面盖上去，**盖上瞬间游戏即可玩（无缝切换）**。确认前可取消（空白处/Esc），确认后不可取消；0 个游戏时点击无响应。技术栈后定，P0 只预留接口。
4. **审核链（P1）**：前端 TextDetector 粗筛（仅拉丁字符集，命中敏感词直接拦截不上传）→ 服务端 ASCII 栅格化（96×72、多级密度字符、强化 prompt：象征性图形也按违规）图形通道 → OCR 英文文本通道 → uncertain 转人工 pending。原则：**宁可错杀**，看不清即拒。
5. **登录（P1）**：终端命令 `login`（默认 GitHub OAuth）、`login <平台名>`（可扩展）、`login -u <用户名>`（进入掩码密码输入 → 校验 env 配置的凭据 → 跳转 admin）。用户名/密码不写死，全部由后端判定。admin 登录页删除，保留隐藏 fallback 入口。
6. **匿名可画**：未登录可画可存 localStorage 草稿，不上传；只有登录用户可提交到公共画布。评论同理（P2，子计划已落地：见 [2026-08-16-p2-comment-account.md](./2026-08-16-p2-comment-account.md)）。
7. **公共画布（P1）**：单幅多人接力。版本化存储（全量快照 + version 递增 + 乐观锁 base_version），提交时"新笔画 + 现存轨迹"整体审核，拒绝则回退（不落库）。
8. **S3 独立项**：ImportMarkdown 增强——base64 图片提取上传 S3 并重写引用（本地路径图片不做，写作时自行上传 S3）。与 P0 解耦，不阻塞。
9. **性能外包**：Cloudflare Tunnel 已部署；主受众放国外。媒体流量走 S3（基建已有），审核 LLM 调用需限流（防审核成本攻击）。
10. **任务队列**：P0（本计划）→ P1（login/用户/画布/审核）→ M3D（纸堆交互）→ P2（评论账号化，子计划已落地，等待批准实施）→ P3（/members 成员页）→ S3 独立项。

## P0 范围

- 游戏注册表 `registry.ts`（唯一事实源，为多游戏铺路）
- 宿主契约 `PaperGameHost` 与 PublicExperience 集成（路由驱动纸面挂载）
- `/games` 大厅页、`/games/[id]` 骨架（一页两用）
- 画板游戏本体：画布渲染、笔画模型、笔刷、撤销/重做、localStorage 草稿、清空、提交按钮占位
- GameCenter 预留接口（类型定义，不实现纸堆动画）
- 配套测试与 e2e 探针更新

**P0 明确不做**：上传/后端接口/审核/登录、纸堆 3D 动画、查看模式内容（仅占位）、/members、评论账号化、S3 base64。

---

## Task 1：游戏注册表

**涉及文件**：`frontend/src/games/registry.ts`（新建）、`frontend/src/games/types.ts`（新建）

**接口定义**（为多游戏与 M3D 预留）：

```ts
// types.ts
export interface GameDefinition {
  /** 稳定 id，用于路由 /games/[id]、草稿命名空间、M3D 纸堆 */
  id: string;
  name: string;          // 大厅/纸堆展示名
  description: string;
  preview: string;       // 静态效果图 URL（M3D 纸堆落定时浮现；设计游戏时配好）
  /** 挂到纸面的游戏组件（桌面端渲染） */
  GameView: ComponentType<GameViewProps>;
  /** 查看模式组件（非桌面端 /games/[id] 渲染，可选） */
  DetailView?: ComponentType<GameViewProps>;
  desktopOnly?: boolean; // 默认 true：只挂 3D 纸面
  /** 是否默认游戏：首页纸面未指定 id 时挂载它 */
  isDefault?: boolean;
}

export interface GameViewProps {
  host: PaperGameHost;   // 宿主契约，见 Task 2
}

// registry.ts
export const GAME_REGISTRY: GameDefinition[] = [/* drawing */];
export function getGame(id: string): GameDefinition | undefined;
export function getDefaultGame(): GameDefinition; // 兜底：首个 isDefault 或注册表第一项
```

**验收**：注册表导出 drawing 游戏；`getGame('drawing')` 命中；`getDefaultGame()` 返回 drawing；TS 类型穷尽。

## Task 2：宿主契约与 PublicExperience 集成

**涉及文件**：`frontend/src/games/host.ts`（新建）、`frontend/src/components/public/PublicExperience.tsx`

**契约**（CSS3DObject 的 DOM transform 已自动处理坐标，宿主内 pointer 事件即纸面本地坐标，游戏无需三维↔二维换算）：

```ts
// host.ts
export interface PaperGameHost {
  /** 把游戏根元素挂进 #paper-screen-host（桌面 3D 纸面） */
  mount(element: HTMLElement): void;
  /** 卸载并清理（模式切换/销毁/切换游戏时调用） */
  unmount(): void;
  /** 纸面尺寸（L1×L2 CSS 像素，host 已按纸形 clip-path 裁剪） */
  getSize(): { width: number; height: number };
}
```

**集成方式**：PublicExperience 通过 `usePathname()` 解析 `/games/[id]`，命中注册表则创建 host 实例并挂载对应 `GameView`；路径不含游戏 id 时挂默认游戏；`desktop-ready` 就绪前不挂载（沿用现有模式状态机）。纸面内容渲染改为"宿主 div 内由游戏组件填充"，`#paper-screen-host` 作为容器常驻（PaperScreen 接管其 transform 的机制不变）。

**验收**：`/games/drawing` 下纸面挂载 drawing 的 GameView；首页挂默认游戏；路由切换（App Router 共享布局）不重建 3D 场景，仅重挂纸面内容；切出游戏路由后纸面内容卸载。

## Task 3：/games 大厅页

**涉及文件**：`frontend/app/(public)/games/page.tsx`（新建）

**内容**：由注册表生成游戏卡片列表（名称/描述/预览图），点击 `router.push('/games/[id]')`。桌面端该页显示在 monitor（现有 screen-host 机制），非桌面正常 DOM 渲染。它是 M3D 纸堆之外的 fallback 导航与 SEO 入口。

**验收**：列表由注册表驱动（加游戏自动出现）；点击进入对应游戏页；无游戏时展示空态。

## Task 4：/games/[id] 骨架

**涉及文件**：`frontend/app/(public)/games/[id]/page.tsx`（新建）、`frontend/app/(public)/games/layout.tsx`（新建，如需要）

**一页两用**：children 渲染游戏说明（桌面 monitor 显示）或 DetailView（非桌面查看模式，P0 先占位，P1 接画布静态渲染）；纸面挂载由 PublicExperience 按路由处理（Task 2），页面组件不感知。未知 id → `notFound()`。

**验收**：`/games/drawing` 桌面端 monitor 显示说明占位、纸面为画板；非桌面访问渲染 DetailView 占位；未知 id 404。

## Task 5：画板游戏本体

**涉及文件**：`frontend/src/games/drawing/DrawingGame.tsx`、`drawingCanvas.ts`（笔画模型与渲染）、`draftStore.ts`（草稿）

**笔画模型**（数据格式现在定死，P1 上传直接复用；坐标为 0-1 相对值，与纸面实际尺寸解耦）：

```ts
interface Stroke {
  id: string;
  color: string;
  width: number;                 // 相对笔宽（0-1）
  points: Array<{ x: number; y: number; t: number }>; // t: 时间戳(ms)
}
type Drawing = { strokes: Stroke[] };
```

**功能**：
- `<canvas>` 铺满 host（`getSize()` 尺寸 + devicePixelRatio 适配），2D context 渲染笔画
- 笔刷：色板（6-8 色）+ 粗细（2-3 级）+ 橡皮（覆盖模式）
- 撤销/重做栈、清空
- localStorage 草稿：绘制过程防抖自动保存（key 命名空间 `game:drawing:draft`），进入时若有草稿提示"继续上次/新画"
- 提交按钮占位（禁用态，P1 接登录与上传）

**验收**：桌面端纸面上可画可擦可撤销可清空；刷新后草稿恢复；切换路由再回来草稿仍在；画布在 host resize 时正确重绘；坐标以 0-1 相对值存储。

## Task 6：GameCenter 预留接口

**涉及文件**：`frontend/src/games/gameCenter.ts`（新建，仅类型）

```ts
export interface GameCenterCallbacks {
  /** M3D 纸堆选中某游戏（纸盖向主纸面时触发，P0 无纸堆，由路由/大厅直达代替） */
  onSelectGame(id: string): void;
}
export interface GameCenterApi {
  /** 注册表驱动：返回当前纸堆应展示的游戏列表（P0 无实现，类型先定） */
  listGames(): GameDefinition[];
  /** 打开/收回纸堆（M3D 实现，P0 空实现） */
  open(): void;
  close(): void;
}
```

**验收**：类型可编译；World/PublicExperience 不因空实现报错。

## Task 7：测试

**涉及文件**：`frontend/src/games/**/*.test.tsx`、`frontend/e2e/games-routes.spec.ts`（新增）

- Vitest：registry 查询、画布渲染（笔画/撤销/重做/清空）、草稿存取（jsdom + localStorage mock）、PublicExperience 路由挂载逻辑
- Playwright：`/games` 列表可见；`/games/drawing` 桌面 project 下纸面挂载画板且可绘制（pointer 事件写下一笔画，canvas 非空）；非桌面 project 渲染查看模式占位

**验收**：`npm run test:run` 与 `npm run test:e2e` 全绿；现有 `paper-layer-probe.spec.ts` 不受影响（层拓扑不变）。

## 实施顺序

1. Task 1（registry/types）→ 2. Task 2（host + PublicExperience 集成）→ 3. Task 3/4（路由骨架）→ 4. Task 5（画板）→ 5. Task 6（GameCenter 类型）→ 6. Task 7（测试）→ 7. 全量验证

## 全局验收（P0 完成定义）

1. 桌面 3D 纸面上可以画、擦、撤销、重做、清空，刷新不丢草稿
2. `/games` 大厅由注册表驱动；`/games/drawing` 桌面挂纸面、非桌面出查看占位
3. 路由切换不刷新 3D 场景，纸面内容正确卸载/挂载
4. 全部测试通过，e2e 探针（含既有 paper-layer-probe）全绿
5. 笔画数据格式与 P1 上传契约一致（0-1 相对坐标、strokes 结构、草稿命名空间约定）

## 后续计划引用

- **P1**：login 命令体系（TerminalCommandBar 掩码输入态 + GitHub OAuth + `-u` env 凭据）、users 表、公共画布版本化（drawing_versions 全量快照 + base_version 乐观锁）、四层审核链（TextDetector 粗筛 → ASCII 96×72 → OCR → 人工 pending）、限流
  - **子计划已先行落地**：GitHub OAuth 登录 + login 命令体系 → 见 [2026-08-12-p1-github-oauth-login.md](./2026-08-12-p1-github-oauth-login.md)（分支 `feat/p1-github-login`，独立 worktree）
- **M3D**：空白纸堆抽卡交互（冻结稿 v2.0，见上文第 3 条），技术栈后定
- **P2**：评论账号化（草稿模式 + login 提醒 + GitHub 头像昵称）
  - **子计划已落地**：登录门槛 + 登录提醒 + 草稿模式（含移除手填昵称、admin 可评）→ 见 [2026-08-16-p2-comment-account.md](./2026-08-16-p2-comment-account.md)（分支待定，实施时创建）
- **P3**：/members 成员页（GitHub 链接 + SEO）
- **S3 独立项**：ImportMarkdown base64 提取上传重写
