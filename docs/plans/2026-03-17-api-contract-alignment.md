# Frontend-Backend API Contract Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 对齐前后端接口契约，修复文章管理、AI分析、评论管理、站点内容等关键功能失效问题。

**Architecture:** 采用“后端兼容增强 + 前端解包规范化”的双端收敛方案。后端新增缺失路由并兼容前端当前调用路径/参数，前端统一通过 `unwrapApiPayload` 消费响应，避免结构漂移。关键行为先补失败测试，再最小改动通过。

**Tech Stack:** Go + Gin + GORM（backend），React + Vite + fetch（frontend），Go test + Vitest。

---

### Task 1: 新增路由契约回归测试（后端）

**Files:**
- Create: `backend/routes/routes_alignment_test.go`
- Modify: `backend/routes/routes.go`
- Test: `backend/routes/routes_alignment_test.go`

**Step 1: Write the failing test**
- 为以下前端依赖端点写存在性测试（未登录预期401，表示路由存在）：
- `POST /api/admin/articles/ai-analyze`
- `GET /api/admin/comments/export`
- `GET /api/admin/comments/limits`
- `POST /api/admin/logout`

**Step 2: Run test to verify it fails**
- Run: `cd backend && go test ./routes -run TestRouteAlignment -v`
- Expected: FAIL with 404 assertions.

**Step 3: Write minimal implementation**
- 在 `routes.go` 注册上述路由。

**Step 4: Run test to verify it passes**
- Run: `cd backend && go test ./routes -run TestRouteAlignment -v`
- Expected: PASS.

### Task 2: 站点内容结构对齐（后端 + 测试）

**Files:**
- Create: `backend/routes/public_siteblocks_test.go`
- Modify: `backend/routes/public.go`
- Test: `backend/routes/public_siteblocks_test.go`

**Step 1: Write the failing test**
- 为 `buildPublicSiteBlockPayload`（新增纯函数）写测试：
- `content` JSON 字符串应解析为对象放入 `content`
- 同时扁平合并到顶层（兼容前端 `siteBlock.title`）

**Step 2: Run test to verify it fails**
- Run: `cd backend && go test ./routes -run TestBuildPublicSiteBlockPayload -v`
- Expected: FAIL with undefined function.

**Step 3: Write minimal implementation**
- 新增函数并在 `GetSiteBlocks` 中使用。

**Step 4: Run test to verify it passes**
- Run: `cd backend && go test ./routes -run TestBuildPublicSiteBlockPayload -v`
- Expected: PASS.

### Task 3: 评论管理契约对齐（后端）

**Files:**
- Modify: `backend/routes/admin_article.go`
- Modify: `backend/routes/comment.go`
- Create: `backend/routes/comment_contract_test.go`
- Test: `backend/routes/comment_contract_test.go`

**Step 1: Write the failing test**
- 为纯函数 `buildCommentLimiterIdentity(email, ip)` 写测试：
- email 非空优先 email
- email 为空回退 ip

**Step 2: Run test to verify it fails**
- Run: `cd backend && go test ./routes -run TestBuildCommentLimiterIdentity -v`
- Expected: FAIL with undefined function.

**Step 3: Write minimal implementation**
- 在 `CreateComment` 中使用身份函数，邮箱为空时不再直接拒绝。
- 在 `AdminGetComments` 中支持 `search/status/page/per_page` 并输出 `article_title`。
- 新增 `AdminExportComments` 和 `AdminGetCommentLimits`。

**Step 4: Run test to verify it passes**
- Run: `cd backend && go test ./routes -run TestBuildCommentLimiterIdentity -v`
- Expected: PASS.

### Task 4: AI 分析契约对齐（后端）

**Files:**
- Modify: `backend/routes/ai.go`
- Modify: `backend/services/ai.go`
- Create: `backend/routes/ai_contract_test.go`
- Test: `backend/routes/ai_contract_test.go`

**Step 1: Write the failing test**
- 为 `normalizeAIAnalyzeResult`（新增纯函数）写测试：
- 能把 JSON 文本解析为 `{category,tags,suggested_summary}`
- 解析失败时降级为 `suggested_summary`

**Step 2: Run test to verify it fails**
- Run: `cd backend && go test ./routes -run TestNormalizeAIAnalyzeResult -v`
- Expected: FAIL with undefined function.

**Step 3: Write minimal implementation**
- 新增 `POST /api/admin/articles/ai-analyze` 处理 `title/content/summary`。
- 复用 AI 调用并统一返回前端需要的字段。

**Step 4: Run test to verify it passes**
- Run: `cd backend && go test ./routes -run TestNormalizeAIAnalyzeResult -v`
- Expected: PASS.

### Task 5: 前端接口消费对齐

**Files:**
- Modify: `frontend/src/admin/components/ArticlesManager.jsx`
- Modify: `frontend/src/admin/components/CommentsManager.jsx`（仅必要兼容）
- Test: `frontend/src/config/api.test.js`（必要时补充）

**Step 1: Write the failing test**
- 增加解析测试：后台文章列表应从 `unwrapApiPayload` 读取 `articles/total`。
- 封面/PDF上传响应应从 payload 读取字段。

**Step 2: Run test to verify it fails**
- Run: `cd frontend && node src/config/api.test.js`
- Expected: FAIL（新增断言前）。

**Step 3: Write minimal implementation**
- 修复 `ArticlesManager` 中 `fetchArticles/handleUploadCover/handleUploadPdf` 的响应读取。

**Step 4: Run test to verify it passes**
- Run: `cd frontend && node src/config/api.test.js`
- Expected: PASS.

### Task 6: 全量验证

**Files:**
- Modify: `backend/routes/*.go`
- Modify: `frontend/src/admin/components/ArticlesManager.jsx`

**Step 1: Run backend tests**
- Run: `cd backend && go test ./...`

**Step 2: Run frontend checks**
- Run: `cd frontend && npm run lint`
- Run: `cd frontend && npm run build`

**Step 3: Record verification evidence**
- 记录通过/失败项及阻塞点。
