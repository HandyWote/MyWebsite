# Admin 模块全量技术债重构设计

> 日期：2026-06-14
> 状态：Approved
> 范围：`frontend/src/admin/` + 关联的 stores、API 层、hooks、shared 组件

## 概述

Admin 模块经过多轮迭代后积累了 17 项技术债，分布在 API 层分裂、状态管理双轨制、组件架构臃肿、通知系统碎片化、样式代码硬编码等维度。本次重构目标是在 **不改变使用体验** 的前提下，逐个清理所有遗留问题，提升代码的可维护性和可扩展性。

## 约束

- **不改变使用体验**：当前 admin 界面已经是暗色终端风格且功能可用，重构不引入视觉或行为变化
- **逐 issue 独立修复**：每个 PR 独立分支，可独立 review、合并、回滚
- **多 worktree 并行**：PR2/PR3/PR4 有串行依赖，PR5 可与 PR3/PR4 并行
- **采用 TDD/REG 范式**：先写测试，再改实现

## 执行策略：主题分组（5 个 PR）

```
PR1  清理层（无依赖，可立即开始）
PR2  API 层统一（地基，PR3/PR4 依赖此 PR）
PR3  状态层重构（依赖 PR2）
PR4  组件层拆分（依赖 PR3）
PR5  样式清理 + 防御层（可与 PR3/PR4 并行，部分依赖 PR4 的 ConfirmDialog）
```

---

## PR1：清理层

**目标**：删除死代码、清理无用 import、统一代码风格。零功能影响。

### 删除文件

| 文件 | 原因 |
|------|------|
| `admin/components/SiteContentEditor.jsx`（140 行） | 未被任何路由引用，已被 `FrontendConfigManager` 取代 |
| `admin/components/AdminRealtimeSockets.test.jsx`（233 行） | 测试不存在的组件，mock 无关的 `@dnd-kit` |

### 清理无用 import / 死变量

| 文件 | 清理内容 |
|------|----------|
| `Login.jsx:10` | 移除未使用的 `PixelInput` 导入 |
| `CommentsManager.jsx:1` | 移除冗余 `import React`（React 19 自动 JSX） |
| `AvatarsManager.jsx:1` | 移除冗余 `import React` |
| `DataImportExport.jsx:1` | 移除冗余 `import React` |
| `AdminLayout.jsx:2` | 移除冗余 `import React` |
| `MarkdownUploadPreview.jsx:1` | 移除冗余 `import React` |
| `CommentsManager.jsx:291` | `_setPerPage` → `perPage` 改为常量 `const PER_PAGE = 10` |
| `DataImportExport.jsx:61,100` | 移除 `console.error()` |

### 统一函数声明风格

目标：全部统一为 `export default function Xxx()` 命名函数声明。

涉及文件：`AdminLayout`、`CommentsManager`、`DataImportExport`、`AvatarsManager`。
子组件（`CommentCard`、`CommentDetailDialog`）同样改为命名声明。

### 测试

- 全量测试确保无引用断裂
- 无需新增测试（纯删除）

### 依赖

无，可立即开始。

---

## PR2：API 层统一

**目标**：将三套并行 API 机制合并为单一模块，内置 401 拦截和错误处理。

### 目标架构

```
frontend/src/
├── config/
│   └── api.js          ← 合并后的单一 API 模块
└── utils/
    └── apiClient.js    ← 删除
```

统一后的 `config/api.js` 职责：

1. **API_ENDPOINTS** — 完整端点注册表（合并旧两处定义 + 补齐幽灵端点）
2. **getApiUrl()** — URL 构建器（合并两套 BASE_URL 逻辑）
3. **apiClient()** — fetch 封装（自动注入 Authorization、response.ok 检查、解包 `{ code, data, msg }`、401 拦截）
4. **uploadFile()** — FormData 上传
5. **api 便捷对象** — `{ get, post, put, del, upload }`
6. **工具函数** — `unwrapApiPayload`、`getApiMessage`

### 端点注册表

保留 `config/api.js` 的完整注册表结构（最全面），补充幽灵端点：

| 新增端点 | 来源 |
|----------|------|
| `ADMIN.VERIFY` | `auth.js` 中硬编码 `/api/admin/verify` |
| `ADMIN.COMMENT_STATUS(id)` | `CommentsManager` 拼接 `${url}/${id}/status` |
| `ADMIN.COMMENT_EXPORT` | `CommentsManager` 拼接 `${url}/export` |
| `ADMIN.AVATAR_SET_CURRENT(id)` | `AvatarsManager` 拼接 |
| `ADMIN.AVATAR_DELETE(id)` | `AvatarsManager` 拼接 |

### 401 拦截器

```javascript
async function apiClient(url, options) {
  const token = localStorage.getItem('token')
  const headers = { ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    clearAuth()
    window.location.href = '/admin/login'
    throw new ApiError(401, '登录已过期')
  }

  if (!response.ok) {
    throw new ApiError(response.status, `请求失败: ${response.statusText}`)
  }

  const data = await response.json()
  if (data.code !== 0) {
    throw new ApiError(data.code, data.msg || '操作失败')
  }

  return data.data
}
```

### 组件迁移清单

| 组件 | 当前方式 | 迁移后 |
|------|---------|--------|
| `Login.jsx` | raw fetch（pre-auth） | 保留 raw fetch（登录不需要 token），统一用 `getApiUrl` + `unwrapApiPayload` |
| `auth.js` | raw fetch | 迁移到 `apiClient`（verify 不需 token 注入，走无 token 路径） |
| `CommentsManager.jsx` | 4 处 raw fetch | 4 处 → `api.get/put/del` |
| `DataImportExport.jsx` | 2 处 raw fetch | 2 处 → `api.get/post` |
| `AvatarsManager.jsx` | 4 处 raw fetch | 4 处 → `api.get/put/del/upload` |
| `FrontendConfigManager.jsx` | 2 处 raw fetch + useMemo token | 2 处 → `api.get/put`（移除 token useMemo） |
| `articleStore.js` | 用 `apiClient.js` | 更新 import 路径 → `config/api.js` |
| `AdminLayout.jsx` handleLogout | 只清 localStorage | 新增调用 `api.post(getApiUrl.adminLogout())` |

### 删除文件

| 文件 | 原因 |
|------|------|
| `utils/apiClient.js` | 功能已合并到 `config/api.js` |
| `hooks/useApi.js` | 遗留 hook，确认存在后删除 |

### 测试

- `apiClient()` 核心函数：单元测试（正常响应、401 拦截、非 ok 响应、code 非 0）
- 端点注册表完整性：快照测试
- 各组件现有测试更新 mock（raw fetch → apiClient mock）

### 依赖

无（PR1 完成后的干净代码库即可）。

---

## PR3：状态层重构

**目标**：创建独立 Zustand stores 替代各组件的 useState + raw fetch，统一通知系统。

### 新 Store 架构

```
frontend/src/stores/
├── articleStore.js      ← 瘦身（仅 CRUD + 分页）
├── uploadStore.js       ← 新建（封面/PDF/Markdown 导入）
├── aiStore.js           ← 新建（分析 + 设置 + 连接测试）
├── commentStore.js      ← 新建
├── avatarStore.js       ← 新建
└── siteBlockStore.js    ← 新建
```

### articleStore 拆分

| Store | 状态 | Actions |
|-------|------|---------|
| `articleStore` | `articles`, `currentArticle`, `pagination`, `loading`, `error` | `fetchArticles`, `fetchArticleById`, `createArticle`, `updateArticle`, `deleteArticle`, `batchDelete`, `reset` |
| `uploadStore` | `coverPreview`, `coverUploading`, `pdfUploading` | `uploadCover`, `uploadPdf`, `importMarkdown`, `resetUploads` |
| `aiStore` | `aiAnalysis`, `aiSuggestions`, `aiSettings`, `loading`, `settingsLoading`, `settingsSaving`, `settingsTesting` | `analyzeContent`, `fetchAiSettings`, `updateAiSettings`, `testAiConnection`, `applySuggestions` |

关键改进：
- 每个 store 有独立的 `loading`/`error`，互不干扰
- `aiStore` 拆分为 `settingsLoading` + `settingsSaving` + `settingsTesting`
- `articleStore.reset()` 包含 `currentArticle` 清理
- `importMarkdown` 使用统一 API 层的 `uploadFile()`

### 新建 Stores

**commentStore：**
- 状态：`comments`, `total`, `page`, `perPage`, `searchTerm`, `statusFilter`, `loading`, `error`
- 操作：`fetchComments`, `deleteComment`, `updateCommentStatus`, `exportComments`

**avatarStore：**
- 状态：`avatars`, `loading`, `error`
- 操作：`fetchAvatars`, `uploadAvatar`, `deleteAvatar`, `setCurrent`, `reorderAvatars`

**siteBlockStore：**
- 状态：`blocks`, `form`, `loading`, `saving`, `error`
- 操作：`fetchBlocks`, `updateForm`, `saveBlocks`

### useNotification Hook 扩展

```javascript
// 使用方式
const notify = useNotification()
notify.success('保存成功')
notify.error('删除失败')
notify.info('正在处理...')
notify.warning('token 即将过期')
```

- API 从 `{ open, message, severity, show }` 改为 `notify.success/error/info/warning(msg)`
- `NotificationSnackbar` 提升到 `AdminLayout` 级别（全局唯一）
- 从各组件中移除内联 snackbar state

### AdminLayout 改动

```diff
+ import { NotificationSnackbar } from '@/hooks/useNotification'

  export default function AdminLayout() {
    return (
      <Box>
        <Header />
        <Tabs />
        <Outlet />
+       <NotificationSnackbar />
      </Box>
    )
  }
```

### 组件迁移清单

| 组件 | 移除的 useState | 迁移到 |
|------|----------------|--------|
| `CommentsManager` | 11 个 useState | `commentStore` |
| `AvatarsManager` | 3 个 useState | `avatarStore` |
| `FrontendConfigManager` | 3 个 useState | `siteBlockStore` |
| `ArticlesManager` | `fileUploading`, `pdfUploading` | `uploadStore` |
| `ArticlesManager` | `aiSettingsForm`, `aiSettingsOpen` | `aiStore` |
| `ArticlesManager` | snackbar state | `useNotification`（全局） |
| `DataImportExport` | snackbar state | `useNotification`（全局） |
| `AvatarsManager` | snackbar state | `useNotification`（全局） |

### 测试

- 每个 store：单元测试（初始状态、各 action、error 路径）
- `useNotification` hook：测试 `success/error/info/warning`
- 各组件现有测试更新 mock

### 依赖

PR2（需要统一 API 层构建 store action）。

---

## PR4：组件层拆分

**目标**：拆分上帝组件，通过 store 直取减少 Props 透传，统一确认对话框模式。

### CommentsManager 拆分

```
admin/components/
├── CommentsManager.jsx          ← 纯编排器（~200 行）
└── comments/
    ├── CommentCard.jsx
    ├── CommentDetailDialog.jsx
    └── index.js
```

迁移到 store 后 CommentsManager 仅保留 UI 编排 + 纯 UI 状态（selectedComment、deleteDialogOpen）。

### ArticleEditDialog Props 减少

```
之前：19 个 props
之后：
<ArticleEditDialog
  open={editDialogOpen}
  isEdit={!!editId}
  article={currentArticle}
  onClose={closeEditDialog}
  onSave={handleSave}
/>
```

Props 从 store 消化：

| 原 prop | 来源 |
|---------|------|
| `loading` | `useArticleStore(s => s.loading)` — 对话框内自行读取 |
| `fileUploading` | `useUploadStore(s => s.coverUploading)` |
| `onUploadCover` | `useUploadStore(s => s.uploadCover)` — 对话框内调用 |
| `coverPreview` | `useUploadStore(s => s.coverPreview)` |
| `pdfUploading` | `useUploadStore(s => s.pdfUploading)` |
| `onUploadPdf` | `useUploadStore(s => s.uploadPdf)` — 对话框内调用 |
| `aiAnalyzing` | `useAiStore(s => s.loading)` |
| `aiSuggestions` | `useAiStore(s => s.suggestions)` |
| `onAiAnalyze` | `useAiStore(s => s.analyzeContent)` — 对话框内调用 |
| `onApplySuggestions` | `useAiStore(s => s.applySuggestions)` — 对话框内调用 |
| `onMarkdownError` | 内联 try/catch 处理 |
| `validateTags` | 提取为共享 util 或内联 |
| `onArticleChange` | store 内 `updateCurrentArticle` |

### AiSettingsDialog 修复

```javascript
<AiSettingsDialog
  open={aiSettingsOpen}
  loading={useAiStore(s => s.settingsLoading)}
  saving={useAiStore(s => s.settingsSaving)}
  testing={useAiStore(s => s.settingsTesting)}
  settings={useAiStore(s => s.settings)}
  onClose={closeAiSettings}
  onSave={useAiStore(s => s.updateSettings)}
  onTest={useAiStore(s => s.testConnection)}
/>
```

### 共享 ConfirmDialog

```
admin/components/shared/
├── ConfirmDialog.jsx
└── index.js
```

替换清单：
- `ArticlesManager` 2 处 `window.confirm` → `<ConfirmDialog>`
- `ArticleEditDialog` 2 处 `window.confirm` → `<ConfirmDialog>`
- `AvatarsManager` 删除操作新增 `<ConfirmDialog>`

### 文件结构变化

```
admin/components/
├── shared/
│   └── ConfirmDialog.jsx
├── comments/
│   ├── CommentCard.jsx
│   ├── CommentDetailDialog.jsx
│   └── index.js
├── CommentsManager.jsx
├── ArticlesManager.jsx
└── articles/
    └── ArticleEditDialog.jsx
```

### 测试

- `ConfirmDialog`：单元测试
- `CommentCard`、`CommentDetailDialog`：独立测试
- `ArticleEditDialog`：更新测试（props 减少，mock store）
- `CommentsManager`：更新测试（mock commentStore）

### 依赖

PR3（需要 stores 消化 props）。

---

## PR5：样式清理 + 防御层

**目标**：消除硬编码值（渲染结果不变），添加 ErrorBoundary，修复散点问题。

### 样式清理

**原则**：替换硬编码十六进制值为 theme system 调用，保持渲染结果完全一致。

| 文件 | 清理内容 |
|------|----------|
| `Login.jsx`（22 个硬编码值） | 复用已导入的 `PixelInput` 替代手动样式的 TextField；其余硬编码值 → pixel token |
| `AvatarsManager.jsx`（5 个硬编码值） | → pixel token |
| `ArticleEditDialog.jsx` | `borderRadius` 不一致（`3` vs `1`）→ 统一为 `0`（pixel token 体系 `borders.radius: '0'`，与当前主题一致） |

### ErrorBoundary

```
admin/components/shared/
├── ConfirmDialog.jsx    ← PR4 创建
├── ErrorBoundary.jsx     ← 新建
└── index.js
```

- class 组件（React 限制）
- pixel 风格错误回退 UI + "重试"按钮
- 放置在 `routes.jsx` 包裹 `RequireAuth + AdminLayout`

### DataImportExport 导入确认

复用 PR4 的 `ConfirmDialog`，导入操作前弹出确认。

### RequireAuth 优化

仅在 mount 时验证 token（不再每次路由变化都验证），后续依赖 `AdminLayout` 的 5 分钟轮询。

### 散点修复

| 问题 | 修复 |
|------|------|
| `FrontendConfigManager` 无保存反馈 | 使用 `notify.success/error` |
| 确认无遗留 `console.error` | grep 确认 |

### 测试

- `ErrorBoundary`：单元测试
- `PixelInput`：Login 集成测试
- DataImportExport：导入确认流程测试

### 依赖

PR4 的 `ConfirmDialog`（DataImportExport 确认对话框）。其余可并行。

---

## 并行执行计划

```
时间线 →

PR1 ████████                                          （立即开始）
PR2         ██████████████                            （PR1 合并后）
PR3                         ██████████████             （PR2 合并后）
PR4                                         ████████████ （PR3 合并后）
PR5                         ██████████████             （可与 PR3 并行，ConfirmDialog 部分待 PR4）
```

PR5 的 ErrorBoundary 和样式清理可与 PR3 同步进行。DataImportExport 确认对话框需等 PR4 的 `ConfirmDialog` 组件。

## 风险评估

| PR | 风险等级 | 主要风险 | 缓解措施 |
|----|---------|---------|---------|
| PR1 | 低 | 引用断裂 | 全量测试 |
| PR2 | 中 | API 调用行为变化 | 充分单元测试 apiClient |
| PR3 | 中 | Store 迁移遗漏状态 | 逐组件对照测试 |
| PR4 | 中 | Props 减少后功能回退 | 逐对话框功能验证 |
| PR5 | 低 | 视觉回归 | 对比截图（像素级不变） |
