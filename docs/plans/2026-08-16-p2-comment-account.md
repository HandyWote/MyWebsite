# P2 子计划：评论账号化（登录门槛 + 登录提醒 + 草稿模式）

- **日期**：2026-08-16
- **状态**：需求已确认（头脑风暴收敛），等待批准后实施
- **范围**：`backend/routes/comment.go`（CreateComment 强制登录）、`frontend/src/components/pixel/`（新增集中式 PixelDialog）、`frontend/src/components/articles/CommentSection.jsx`（登录门槛交互 + 草稿模式）、前后端测试
- **关联**：主计划《纸面绘图小游戏 P0 实现计划》（`2026-08-12-paper-drawing-game-p0.md`）任务队列 P2「评论账号化」；前置 P1 登录体系已合并（PR #5）；P1 §5.1「评论复用 GitHub 身份」已落地（后端 `d9d79b1`、前端 `7d13aa9`），本计划在其上收口「只有登录用户可评论」

---

## 0. 背景与已锁定决策

P1 收口后评论仍允许匿名提交：后端 `CreateComment` 不鉴权（无 token 照常入库，测试 `TestCreateCommentAnonymousKeepsManualAuthor` 显式断言），前端 guest 手填 `$ name` 即可发布。用户确认的 P2 需求与决策：

1. **只有登录用户可评论**：匿名（无有效 JWT）提交一律拒绝。后端 401 兜底（防绕过前端直接 POST），前端拦截只是体验层。
2. **登录提醒**：未登录点击 submit 弹出提醒并提供 GitHub 登录入口；**文案统一英文终端风格**（与 `$ name` / `> submit` / `// no comments yet` / `signing in…` 一致）。
3. **管理员允许评论**：`login -u`（provider=password）可评，author = `ADMIN_USERNAME`（env 配置），无头像。
4. **移除手填昵称**：`$ name` 输入框删除，身份一律来自会话——登录后才能评论，手填已无意义。
5. **草稿模式**：未登录可写可存，仅"发表"被拦——访客内容不因登录跳转而丢失。
6. **组件复用**：弹窗用集中式 pixel 系统，新增 `PixelDialog` 进 `pixel/ui/` 并从 `pixel/index.jsx` 导出；不另起炉灶、不反向引用 admin 组件。

### 提醒形式（头脑风暴收敛：方案 D = 内联提示 + Dialog）

| 时刻 | 形式 |
|---|---|
| 发现时刻 | guest 身份位常驻 `// not signed in`（弱化色，占原 `$ name` 输入框位置） |
| 触发时刻 | guest 点 submit（有内容）→ PixelDialog 弹出，**不发任何请求** |
| 回流时刻 | 草稿 localStorage 自动保存/恢复，登录跳回后内容原样 |

否决项：纯 Snackbar（3s 自动消失易错过、需扩展全局通知 store 支持按钮、与硬门槛语义不匹配）；纯内联禁用按钮（不解释原因、不满足"点击弹出提醒"）。

## 1. 后端变更（`backend/routes/comment.go` + 契约测试）

`CreateComment` 前置鉴权，身份解析扩展（现 `commentIdentityUser` 覆盖两种 provider）：

```go
// 伪代码
if identity := commentSessionUser(c); identity == nil {
    c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录后再评论"})
    return
}
```

- **`github`**：查 users 表 → `DisplayName`（空则 `Username`）/ `AvatarURL` 覆盖 author/头像（现有逻辑与测试保留，防伪造）
- **`password`（admin）**：author = `cfg.AdminUsername`，avatar_url 空
- 无 token / 无效 token / 解析失败 → 401
- 评论限流（email/IP 维度）保留，位于鉴权之后
- 无 DB 变更、无迁移、无新 env；`me()` 不变（admin 已有 username）

## 2. 前端变更

### 2.1 新组件 `PixelDialog`（`pixel/ui/PixelDialog.jsx`，`index.jsx` 导出）

集中式公共弹窗容器，与 admin `ConfirmDialog` 视觉同源（同吃 pixel tokens）：

```jsx
<PixelDialog
  open={open}
  title="sign in required"   // monospace 标题（蓝色），下边框分隔
  onClose={close}            // Esc / 遮罩点击关闭
  actions={<PixelButton …/>} // 操作区，上边框分隔
>
  <PixelTypography variant="body2" muted code>…</PixelTypography>
</PixelDialog>
```

- 底座 MUI `Dialog`（`themeOptions.ts` 已全局像素化：直角、实线边框、`bg.secondary`）
- 标题/正文用 `PixelTypography`（monospace、muted），按钮用 `PixelButton`（primary 荧光 / ghost 弱化）
- 自带单测：标题/内容/actions 渲染、onClose 触发、open=false 不渲染

### 2.2 `CommentSection.jsx` 改造

| 项 | 现状 → 目标 |
|---|---|
| `$ name` 输入框 + `commentAuthor` state | 删除 |
| guest 身份位 | `// not signed in`（text.secondary，monospace） |
| github 身份 | 徽章 `$ name <display> (github)` + 头像（现有保留） |
| admin 身份 | 徽章 `$ name <username> (admin)` + 首字母头像（新增分支） |
| guest 点 submit | 有内容 → 打开 PixelDialog；无内容按钮保持禁用 |
| 草稿 | 输入防抖（~500ms）存 `localStorage comment:draft:<articleId>`；挂载恢复（含登录跳回）；提交成功清除；不同文章 key 隔离 |

- `demoMode` 行为不变（全禁用）
- 提交请求体不变（author/email/avatar_url/content），author 由会话提供

## 3. 文案（英文终端风格，统一）

| 位置 | 文案 |
|---|---|
| guest 身份位 | `// not signed in` |
| Dialog 标题 | `sign in required` |
| Dialog 正文 | `comments require a GitHub sign-in. your draft is saved.` |
| 主按钮 | `sign in with GitHub`（与终端 help 文案一致） |
| 次按钮 | `not now` |
| 后端 401 | `请先登录后再评论`（服务端消息，前端兜底展示） |

## 4. 任务拆分

| ID | 任务 | 依赖 |
|---|---|---|
| C1 | 后端：CreateComment 强制登录 + admin 身份 + contract 测试更新（匿名 401、admin=ADMIN_USERNAME、github 覆盖保留） | — |
| C2 | 前端：PixelDialog 组件 + 单测 + index 导出 | — |
| C3 | 前端：CommentSection 改造（删昵称输入、双 provider 徽章、guest 拦截 + Dialog、草稿模式）+ 单测更新 | C2 |
| C4 | 收尾：全量验证（`go test ./...` / vitest / lint / build；既有 e2e 不受影响） | C1, C3 |

实施顺序：C1 ‖ C2 → C3 → C4（C1/C2 文件互不重叠可并行）

## 5. 全局验收（完成定义）

1. 匿名 POST `/api/articles/:id/comments` → 401；前端 guest 点 submit → 弹 Dialog 且不发请求
2. GitHub 登录：无昵称输入框、徽章+头像；发布后 author/头像为服务端身份（防伪造，现有测试保留）
3. admin 登录：徽章 `(admin)`；发布后 author = ADMIN_USERNAME
4. 草稿：guest 打字 → 刷新不丢 → 登录跳回原样恢复 → 提交成功清除；不同文章互不干扰
5. `go test ./...`、`npm run test:run`、`npm run lint`、`npm run build` 全绿；e2e（auth-login 等）不受影响
6. P1 §5.1 已有 GitHub 评论身份功能无回归

## 6. 边界与风险

- StrictMode 双挂载：草稿恢复只执行一次（effect active 守卫）
- 401 竞态：已登录用户 token 过期 → useSession 已静默降级 guest，submit 走 Dialog 分支；极少数穿透由后端 401 + browserRequest 现有 clearAuth/回首页兜底
- 草稿 key 命名空间 `comment:draft:` 与画板草稿 `game:drawing:draft` 同模式，互不冲突
- 不做：评论列表展示层无改动；通知/成功文案保持现状（英文化列为后续可选）
