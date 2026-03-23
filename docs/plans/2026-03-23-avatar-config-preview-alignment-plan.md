# Avatar/Config/Preview Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复头像上传后前台显示异常，清理后台无前台映射的设置入口，并让后台文章预览与前台渲染保持一致。

**Architecture:** 前台头像读取统一走头像接口并解析 `is_current`；后台保留单一“前台配置”入口并删除重复导航；提取共享 markdown 渲染组件，由前后台共同复用，避免双实现分叉。

**Tech Stack:** React 19 + Vite + MUI + Vitest, Go + Gin（仅最小后端改动）

---

### Task 1: Sidebar 头像读取改为与 Home 一致（接口驱动）

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Test: `frontend/src/components/Sidebar.test.jsx`

**Step 1: Write the failing test**

在 `Sidebar.test.jsx` 增加用例：mock `/api/site-blocks` 与 `/api/avatars`，断言头像请求被触发并渲染来自头像接口的 URL。

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:run -- src/components/Sidebar.test.jsx`
Expected: FAIL，当前实现仅使用 `siteBlock.avatar`。

**Step 3: Write minimal implementation**

在 `Sidebar.jsx` 增加头像请求逻辑：
- 请求 `getApiUrl.avatars()`
- 找到 `is_current` 头像
- 使用 `getApiUrl.avatarFile(filename)` 作为展示地址
- 缺省回退 `/avatar.webp`

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:run -- src/components/Sidebar.test.jsx`
Expected: PASS。

**Step 5: Commit**

```bash
git add frontend/src/components/Sidebar.jsx frontend/src/components/Sidebar.test.jsx
git commit -m "fix(frontend): align sidebar avatar source with home"
```

### Task 2: 后台移除无前台映射入口（content）

**Files:**
- Modify: `frontend/src/admin/components/AdminLayout.jsx`
- Modify: `frontend/src/admin/routes.jsx`
- Test: `frontend/src/admin/components/AdminRealtimeSockets.test.jsx`

**Step 1: Write the failing test**

在 `AdminRealtimeSockets.test.jsx` 新增断言：后台导航不应出现 `Content` 标签。

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:run -- src/admin/components/AdminRealtimeSockets.test.jsx`
Expected: FAIL，当前存在 `Content` Tab。

**Step 3: Write minimal implementation**

- 从 `AdminLayout.jsx` 的 `tabList` 中删除 `Content`。
- 从 `routes.jsx` 删除 `content` 路由。
- 将后台 index 路由改为 `FrontendConfigManager`。

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:run -- src/admin/components/AdminRealtimeSockets.test.jsx`
Expected: PASS。

**Step 5: Commit**

```bash
git add frontend/src/admin/components/AdminLayout.jsx frontend/src/admin/routes.jsx frontend/src/admin/components/AdminRealtimeSockets.test.jsx
git commit -m "refactor(admin): keep only frontend-mapped config entry"
```

### Task 3: 抽取共享 Markdown 渲染组件并前后台共用

**Files:**
- Create: `frontend/src/components/articles/ArticleMarkdownContent.jsx`
- Modify: `frontend/src/components/ArticleDetail.jsx`
- Modify: `frontend/src/admin/components/articles/MarkdownUploadPreview.jsx`
- Test: `frontend/src/admin/components/articles/MarkdownUploadPreview.test.jsx`

**Step 1: Write the failing test**

新增 `MarkdownUploadPreview.test.jsx`：
- mock markdown 内容（含代码块/普通段落）
- 断言预览中使用共享组件导出的容器标识（如 `data-testid="article-markdown-content"`）

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:run -- src/admin/components/articles/MarkdownUploadPreview.test.jsx`
Expected: FAIL，当前后台预览未复用共享组件。

**Step 3: Write minimal implementation**

- 提取 `ArticleDetail` 的 markdown 渲染逻辑到共享组件。
- `ArticleDetail` 改为调用共享组件。
- `MarkdownUploadPreview` 改为调用共享组件。

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:run -- src/admin/components/articles/MarkdownUploadPreview.test.jsx`
Expected: PASS。

**Step 5: Commit**

```bash
git add frontend/src/components/articles/ArticleMarkdownContent.jsx frontend/src/components/ArticleDetail.jsx frontend/src/admin/components/articles/MarkdownUploadPreview.jsx frontend/src/admin/components/articles/MarkdownUploadPreview.test.jsx
git commit -m "refactor(frontend): share markdown renderer between admin and public"
```

### Task 4: 上传头像默认设为当前头像

**Files:**
- Modify: `backend/routes/public.go`
- Modify: `backend/routes/avatar_upload_test.go`

**Step 1: Write the failing test**

在 `avatar_upload_test.go` 增加逻辑测试：新上传头像后应为 `is_current=true`（并清除其他 current）。

**Step 2: Run test to verify it fails**

Run: `cd backend && go test ./routes -run Avatar -v`
Expected: FAIL，当前上传默认 `is_current=false`。

**Step 3: Write minimal implementation**

在 `UploadAvatar` 中：
- 先将所有头像置 `is_current=false`
- 新建头像时置 `is_current=true`

**Step 4: Run test to verify it passes**

Run: `cd backend && go test ./routes -run Avatar -v`
Expected: PASS。

**Step 5: Commit**

```bash
git add backend/routes/public.go backend/routes/avatar_upload_test.go
git commit -m "fix(api): set uploaded avatar as current by default"
```

### Task 5: 回归验证

**Files:**
- Review only

**Step 1: Run focused frontend tests**

Run:
- `cd frontend && npm run test:run -- src/components/Sidebar.test.jsx`
- `cd frontend && npm run test:run -- src/admin/components/AdminRealtimeSockets.test.jsx`
- `cd frontend && npm run test:run -- src/admin/components/articles/MarkdownUploadPreview.test.jsx`

Expected: PASS。

**Step 2: Run focused backend tests**

Run: `cd backend && go test ./routes -run Avatar -v`
Expected: PASS。

**Step 3: Record verification**

在交付说明中列出：
- 头像显示链路统一结果
- 后台菜单清理结果
- 文章预览共享渲染结果
- 测试命令与通过情况
