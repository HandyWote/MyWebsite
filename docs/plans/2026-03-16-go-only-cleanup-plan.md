# Go-Only Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将项目收敛为 Go 后端 + REST 前端，移除 Socket.IO 与 Python 后端残留。

**Architecture:** 前端去除实时连接路径，统一使用已有 REST 拉取与操作后刷新；后端保留 `main.go` 及 Go 路由/模型，删除 Python 入口、模块与测试。文档与构建配置同步更新，保证开发与部署说明一致。

**Tech Stack:** Go (Gin/GORM), React 19 + Vite + Vitest, Docker Compose

---

### Task 1: 前端测试先行（TDD Red）

**Files:**
- Modify: `frontend/src/components/Home.test.jsx`
- Modify: `frontend/src/admin/components/AdminRealtimeSockets.test.jsx`

**Step 1: 写失败测试**
- 将断言改为“不应建立 socket 连接”。

**Step 2: 运行并验证失败**
- Run: `cd frontend && npm run test:run -- src/components/Home.test.jsx src/admin/components/AdminRealtimeSockets.test.jsx`
- Expected: FAIL，提示 socket 调用发生。

### Task 2: 前端实现（Green）

**Files:**
- Modify: `frontend/src/components/Home.jsx`
- Modify: `frontend/src/admin/components/SiteContentEditor.jsx`
- Modify: `frontend/src/admin/components/SkillsManager.jsx`
- Modify: `frontend/src/admin/components/ContactsManager.jsx`
- Modify: `frontend/src/admin/components/AvatarsManager.jsx`
- Modify: `frontend/src/admin/components/ArticlesManager.jsx`
- Modify: `frontend/src/admin/components/CommentsManager.jsx`

**Step 1: 移除 socket.io 连接代码**
- 删除 `socket.io-client` import、socket state、连接/清理逻辑。

**Step 2: 运行测试验证通过**
- Run: Task 1 同命令。
- Expected: PASS。

### Task 3: 配置与依赖清理

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/vite.config.js`
- Modify: `frontend/nginx.conf`
- Modify: `frontend/src/config/api.js`
- Modify: `frontend/src/config/api.test.js`
- Modify: `frontend/src/config/debug.js`
- Modify: `frontend/src/components/ArticleCard.jsx`
- Modify: `frontend/src/components/ArticleDetail.jsx`
- Modify: `frontend/src/components/PdfViewerOnCanvas.jsx`
- Modify: `frontend/src/admin/components/ArticlesManager.jsx`

**Step 1: 移除依赖和代理**
- `npm uninstall socket.io-client`
- 删除 `/socket.io` 代理与 Nginx socket 转发。

**Step 2: URL helper 语义调整**
- 将资源拼接 helper 从 `websocket()` 调整为 `baseUrl()`。

### Task 4: 删除 Python 后端残留

**Files:**
- Delete: `backend/**/*.py`（仅 git 跟踪）
- Delete: `backend/pyproject.toml`
- Delete: `backend/pytest.ini`
- Delete: `backend/uv.lock`

**Step 1: 批量删除**
- Run: `git ls-files ... | xargs rm`

**Step 2: 检查未删漏**
- Run: `rg -n "Flask|app.py|socketio|socket.io" backend`

### Task 5: 文档更新与验证

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`

**Step 1: 文档改为 Go-only**
- 删除 Flask/Socket.IO/uv 相关说明，更新为 Go 运行方式。

**Step 2: 最终验证**
- Run: `cd frontend && npm run test:run -- src/components/Home.test.jsx src/admin/components/AdminRealtimeSockets.test.jsx src/admin/components/ArticlesManager.test.jsx src/config/api.test.js`
- Run: `cd frontend && npm run lint`
- Run: `cd backend && go test ./...`

