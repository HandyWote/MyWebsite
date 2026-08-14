# P1 子计划：GitHub OAuth 登录 + login 命令体系

- **日期**：2026-08-13
- **状态**：需求已确认（头脑风暴收敛），按计划执行
- **分支**：`feat/p1-github-login`（独立 worktree：`../MyWebsite-p1-login`）
- **关联**：本计划是《纸面绘图小游戏 P0 实现计划》（`2026-08-12-paper-drawing-game-p0.md`）的 P1 阶段**登录部分**先行落地；公共画布与审核链仍留在 P1 后续/独立计划
- **范围**：`backend/`（User 模型、GitHub OAuth、JWT 角色化、限流）、`frontend/`（终端命令状态机、/auth/callback、admin 登录页移除）

---

## 0. 背景与已锁定决策

P0 计划第 5 条要求登录体系：终端命令 `login`（默认 GitHub OAuth）、`login <平台名>`、`login -u <用户名>`（掩码密码 → env 凭据 → 跳转 admin），admin 登录页删除保留隐藏 fallback。经头脑风暴，以下决策**已冻结**（后续计划以本清单为准）：

1. **双轨身份，零角色表**：管理员身份唯一来源是 env `ADMIN_USERNAME`/`ADMIN_PASSWORD`（不落表，`login -u` 走 `/api/auth/login`）；GitHub OAuth 用户一律是**普通用户**，落 `users` 表（为 P1 画布上传、P2 评论账号化铺路）。不做"第一个登录者自动 admin"（竞态夺权风险），不做 GitHub 用户名白名单（用户已否决）。
2. **JWT 携带 provider**：claims 增加 `provider` 字段（`password` = 管理员 / `github` = 普通用户）。admin 路由组挂 `RequireAdmin` 中间件。**旧 token 无 provider 按 `password` 兼容**（旧系统只有管理员能拿到 token，升级不断会话）。
3. **OAuth 授权码模式 + 一次性 code**：前端跳 `/api/auth/github/authorize` → GitHub → 回调后端换 token/取用户/upsert → 签发**一次性短时效 code**（内存 map，`crypto/rand` 32 字节，60s 过期，单次使用即删）→ 302 回前端 `/auth/callback?code=…` → 前端 POST `/api/auth/exchange` 换 JWT。**JWT 不落地 URL**（防 referrer/日志泄漏）。state 存 `httpOnly` cookie 防 CSRF，`Secure` 按回调 URL scheme 判断。
4. **回调地址显式配置**：`GITHUB_OAUTH_REDIRECT_URI` 由 env 显式指定（不拼请求 Host，防 Host 头攻击）；`GITHUB_OAUTH_CLIENT_ID`/`GITHUB_OAUTH_CLIENT_SECRET` 未配置时，`login` 命令优雅降级：提示 not configured 并引导 `login -u`。
5. **终端命令**：`login` / `login github` → GitHub OAuth；`login -u [用户名]` → 掩码密码输入（镜像层 `*` 遮罩、Esc/空回车取消、提交期间禁输入）→ 成功**直接跳 `/admin`**；`login`（已登录）提示 already logged in；`logout` 清 token；`whoami` 显示当前用户；提示符随登录态变化；help 补充。
6. **GitHub 登录成功后跳回来源页**：authorize 携带 `redirect_to`（站内路径校验），随回调透传，exchange 后返回给前端，`/auth/callback` 据此跳转；非法值回退首页。
7. **删除 `/admin/login`**：页面与入口全删。`RequireAuth` 未登录或非管理员访问 `/admin` → 清 token + 直接跳首页（带提示）；`browserRequest` 401 处理（`redirectToLogin`）同样改跳首页。非桌面设备（手机等）均可通过终端 `login -u` 进后台，无需登录页。
8. **密码登录限流**：内存计数（`sync.Map` + 窗口），key = IP + username（IP 取 `X-Forwarded-For` 首值），默认 5 次失败锁 15 分钟，env 可配 `LOGIN_RATE_LIMIT_MAX` / `LOGIN_RATE_LIMIT_WINDOW_MINUTES`。GitHub OAuth 不限（GitHub 侧已有保护）。限流器可注入 clock 便于测试；接线在路由任务完成。
9. **users 表唯一约束**：`(provider, provider_id)` 组合唯一索引（provider_id = GitHub 数字 ID，终身不变）。`username`/`display_name`/`avatar_url`/`email` 仅展示，每次登录 upsert 刷新；**email 可空、不建唯一约束**（GitHub 邮箱可隐藏返回 null、可修改）。
10. **单实例假设**：一次性 code 存进程内存，注释标注"多实例部署需落 DB"（当前 docker-compose 单容器成立）。

## 1. 身份模型与数据

```go
// models.User（表名 users，AutoMigrate 注册）
type User struct {
    ID          uint           // PK
    Provider    string         // github（字段保留，未来可扩展）
    ProviderID  string         // GitHub 数字 ID；唯一索引 (provider, provider_id)
    Username    string         // GitHub login，仅展示
    DisplayName string
    AvatarURL   string         // GitHub 头像 URL（P2 评论直接用）
    Email       string         // 可空，无约束
    LastLoginAt time.Time
}
```

`user_repository.go`：`UpsertGitHubUser(...)`（按 provider+provider_id upsert 并刷新展示字段与 last_login_at）、`FindByProviderID(...)`，复用 `repositories/base.go` 模式。

## 2. 后端 API 契约

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/auth/github/authorize` | 无 | 302 GitHub（`client_id`/`redirect_uri`/`state`）；未配置 → 400 提示 not configured |
| GET | `/api/auth/github/callback` | 无 | 校验 state → code 换 access_token → `GET /user` → upsert → 签发一次性 code → 302 前端 `/auth/callback?code=…&redirect_to=…`；GitHub error（如 access_denied）→ 302 带 `error` 参数 |
| POST | `/api/auth/exchange` | 无（code 即凭据） | 一次性 code 换 `{ token, user, redirect_to }`；code 无效/过期 → 401 |
| POST | `/api/auth/login` | 无 | 保留（`login -u` 用）：env 校验 + 限流，签发 `provider=password` 的 JWT |
| POST | `/api/auth/logout` | 无 | 保留 |
| GET | `/api/auth/me` | 可选 | 有 token → `{ username, provider, avatar_url, display_name }`；无 token → 401 |
| GET | `/api/admin/verify` | JWT + RequireAdmin | 语义改为 admin 校验：github provider → 403/valid=false |
| GET | `/api/admin/auth/me` | JWT + RequireAdmin | 保留兼容 |

JWT claims：`{ username, provider, exp }`。`GenerateToken(username, provider, secretKey, expiresIn)`。

## 3. 终端命令设计（TerminalCommandBar）

状态扩展：`inputMode: 'command' | 'password'`（掩码模式镜像层渲染 `*`）。

| 输入 | 行为与提示 |
|---|---|
| `login` / `login github` | 已登录 → `already logged in as <user>, use logout first`；未配置 → `github oauth not configured`（不引导 `login -u`）；正常 → 输出 `opening GitHub authorization…` 后 `window.location.href = '/api/auth/github/authorize?redirect_to=<当前路径>'` |
| `login -u` / `login -u <用户名>` | 进入掩码模式，提示 `password:`；空回车/Esc 取消回命令模式；提交期间禁用输入；失败输出 `invalid credentials` 可重试；成功存 token → `router.push('/admin')` |
| `whoami` | 已登录 → `<username> (github\|admin)`；未登录 → `not logged in` |
| `logout` | 清 token → `logged out`；未登录 → `not logged in` |
| `help` | 追加 login / logout / whoami 三行（不展示 `login -u`，访客不暴露管理员入口） |

提示符：`guest@<cwd> $` ↔ `<username>@<cwd> $`。登录态由 `useSession` hook 提供（localStorage token + `/api/auth/me` 缓存，admin 与公共端共用；401 静默清 token 不跳页，跳页由调用方负责）。

## 4. 前端页面改造

- **`/auth/callback`**（`app/(public)/auth/callback/page.tsx`）：极简 loading 页。`?error=` → 显示"授权取消/失败"提示后跳回来源（或首页）；`?code=` → POST exchange → 存 token → 跳 `redirect_to`（站内校验）；无参数 → 回首页。
- **删除 `/admin/login`**：页面、`Login.jsx`、相关测试。`RequireAuth`：未登录或非 admin → 清 token + 跳首页带提示。`browser.ts` 的 `redirectToLogin` 改为跳首页。

## 5. 任务拆分

| ID | 任务 | 依赖 |
|---|---|---|
| B1 | 后端：User 模型 + user 仓库 + AutoMigrate 注册 | — |
| B2 | 后端：config 扩展（GITHUB_OAUTH_*、LOGIN_RATE_LIMIT_*）+ .env.example | — |
| B3 | 后端：JWT provider claim + RequireAdmin + 旧 token 兼容 | — |
| B4 | 后端：GitHub OAuth handler（authorize/callback/exchange）+ 一次性 code | B1, B2 |
| B5 | 后端：密码登录限流器（本体 + 单测；接线在 B6） | B2 |
| B6 | 后端：路由接线（me、RequireAdmin 挂载、verify 改造、Login 接限流） | B3, B4, B5 |
| F1 | 前端：useSession hook + authApi 扩展 | — |
| F2 | 前端：TerminalCommandBar 状态机（掩码 + login/logout/whoami） | F1 |
| F3 | 前端：/auth/callback 页面 | F1 |
| F4 | 前端：删除 /admin/login、RequireAuth 与 401 跳转改造 | F1 |
| F5 | 前端：e2e mock-backend 扩展 + 全量测试 | F2, F3, F4 |
| V1 | 收尾：全量验证 + 生产 GitHub App 对齐 + 测试记录清理 | B6, F5 |

### 5.1 合并后修正（实施中发现）

- **移除 `remember` 字段**：`authApi.login` 请求体类型（`authApi.ts`）与终端登录调用（`TerminalCommandBar.tsx`）中的 `remember: false` 是无效参数——后端 `POST /api/auth/login`（`routes/auth.go`）只绑定 `username`/`password`，从不解析该字段，登录态一律 localStorage 持久化（`useSession`，刷新不丢、JWT 默认 24h 过期后降级 guest）。删除字段类型、调用处传参与 `TerminalCommandBar.test.tsx` / `authApi.test.ts` 中对应的请求体断言，保持前端契约与后端一致；后端无改动。
- **终端输入框自动聚焦（已回退）**：`TerminalCommandBar` 的真实 input（透明覆盖层）目前无任何聚焦逻辑（无 `autoFocus`/`ref`），用户进入页面后焦点不在输入框。曾试修复：input 挂 `ref`，mount 后 `useEffect` 聚焦。**回退原因**：与下方"终端聚焦守护"一同撤销——mount 聚焦对 3D 接管后失焦无效，且配套守护误抢评论框焦点。保留记录备查，方案见下方"聚焦守护"条目的 v2 方向。
- **文章详情光标位置**：`app/(public)/articles/[id]/page.tsx` 的闪烁光标（`cursor-blink` Box）是 `h1` 标题的**兄弟节点**，块级标题自带 `mb: 2`，光标因此落在标题下方独立一行（带 16px 空隙），不符合"光标紧跟刚打出的标题"的终端语义。修复：把光标 Box 移入 `Typography h1` 内部、标题文本之后，内联在标题行末尾；共享 CSS（`.cursor-blink::after`）不动，终端栏不受影响。补测试断言（光标位于 h1 内）。
- **光标尺寸统一 em 化**：两处光标块都是固定 `width: 8, height: 16`（px），与各自字号不匹配——终端栏字号 `0.8125rem`（16px 块比 13px 字还高），文章标题 `variant="h2"`（≈48px，8×16 块太小，且 `::after` 的 `_` 继承 h1 字号后与块大小分裂）。修复：两处光标 Box 尺寸改 `em` 相对单位（`height: "1.2em"`、`width: "0.55em"`、`ml: "0.15em"`），块与下划线随容器字号同步缩放，比例与终端一致。
- **终端聚焦守护（已回退，留 v2 方向）**：mount 时 `useEffect` 聚焦后，桌面 3D 模式下 `CSS3DRenderer` 会把 `#screen-host`（含输入框）移入其 DOM 树（`appendChild` = 先 remove 再 append），焦点元素脱离文档时被浏览器 blur 到 body；曾试修复：`focusout` 监听（capture），`document.activeElement` 落回 `body` 时抢回终端输入框。**回退原因**：① 抢回发生在元素 detached 期间，`focus()` 对脱离文档的元素无效，3D 失焦未救回；② 评论框等输入区同样受 3D 干扰失焦时，守护一律抢回终端，导致评论无法输入。**v2 方向（暂缓）**：a) focusout 后 `requestAnimationFrame` 延迟抢回（等 remove→append 完成、元素重新挂载）；b) `pointerdown` 记录用户最后点击的输入元素，失焦 1s 内把焦点还给该元素而非终端；c) 点击终端栏区域（非输入区）聚焦终端；d) 可选 MutationObserver 观察 `#screen-host` 父节点变化兜底。
- **评论复用 GitHub 身份**：评论系统（`CommentSection.jsx` + 后端 `CreateComment`）未接入登录态，GitHub 登录后仍强制手填 `$ name`，头像只显示首字母。修复：后端 `Comment` 表加 `avatar_url` 列（仅存 GitHub 头像**链接**，不存文件）；`CreateComment` 带有效 JWT 时查 `users` 表，用 GitHub 用户的 `DisplayName`/`AvatarURL` 覆盖 `author`/头像（防伪造）；匿名不带 token 照旧可评。前端 `CommentSection` 接 `useSession`：GitHub 登录后隐藏 `$ name` 输入框，提交自动带用户名 + 头像；评论列表有 `avatar_url` 渲染 `<Avatar src>`，否则首字母回退。

## 6. 实施顺序与并行

```
第一批（无依赖，文件互不重叠，可并行）：B1 | B2 | B3 | F1
第二批：B4(←B1,B2) | B5(←B2) | F2(←F1) | F3(←F1) | F4(←F1)
第三批：B6(←B3,B4,B5) | F5(←F2,F3,F4)
收尾：V1
```

冲突注意：B3 独占 `routes/auth.go` 的 GenerateToken 调用点；B5 只新建限流器文件，Login 接入限流由 B6 完成；B6 最后统一动 `routes/auth.go` / `routes/routes.go`。

## 7. 全局验收（完成定义）

1. `login` 全流程：终端跳 GitHub → 授权 → 回站 → token 落地 → 跳回来源页；用户落 `users` 表（upsert 幂等）
2. `login -u`：掩码输入、取消、失败重试、成功直跳 `/admin`；`logout`/`whoami` 行为与提示语符合第 3 节表格
3. GitHub 用户（provider=github）访问 `/api/admin/*` 被拒；旧 token 仍可访问 admin
4. `/admin/login` 404；未登录/非 admin 访问 `/admin` 直接跳首页；桌面与非桌面设备均可用终端登录
5. 密码登录超限返回 429；窗口过期恢复
6. 未配置 GitHub OAuth env 时 `login` 降级提示，不影响 `login -u`
7. `go test ./...`、`npm run test:run`、`npm run lint`、`npm run test:e2e`、`npm run build` 全绿；现有 e2e 探针（paper-layer-probe 等）不受影响
8. 生产 GitHub OAuth App 配置就位（用户提供 client_id/secret/redirect_uri）；测试产生的 users 记录已清理（或给出清理 SQL），GitHub App 测试授权已撤销

## 8. 环境与部署

新增 env（`backend/.env.example` 与根 `.env.example` 同步）：

```
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_REDIRECT_URI=https://<域名>/api/auth/github/callback
LOGIN_RATE_LIMIT_MAX=5
LOGIN_RATE_LIMIT_WINDOW_MINUTES=15
```

- GitHub OAuth App 回调 URL 必须与 `GITHUB_OAUTH_REDIRECT_URI` 完全一致（生产 App 由用户创建）
- 本地开发：后端单测用 httptest mock GitHub API；本地手动冒烟用临时 dev App 或临时修改生产 App 回调，与用户对齐后执行
- 测试后清理：`DELETE FROM users WHERE provider='github' AND username='<测试用户>';` + GitHub App 撤销测试授权
