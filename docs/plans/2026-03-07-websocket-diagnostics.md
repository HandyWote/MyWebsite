# WebSocket Diagnostics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 增加一套可开关的 WebSocket 诊断日志，帮助定位连接失败发生在客户端、代理层还是 Flask-SocketIO。

**Architecture:** 后端通过环境变量控制是否启用 Socket.IO/Engine.IO 详细日志，默认保持关闭。前端仅增强 `connect_error` 的输出内容，打印 transport、message、description、context 等关键信息，不改现有连接策略与业务监听逻辑。

**Tech Stack:** Flask-SocketIO, React 19, Vite, Vitest, pytest

---

### Task 1: 前端诊断日志测试与实现

**Files:**
- Modify: `frontend/src/components/Home.jsx`
- Modify: `frontend/src/components/Home.test.jsx`

**Step 1: Write the failing test**
- 断言 `connect_error` 日志包含命名空间和错误详情对象。

**Step 2: Run test to verify it fails**
- Run: `npm test -- --run src/components/Home.test.jsx`

**Step 3: Write minimal implementation**
- 在 `connect_error` 中输出结构化对象而不是只打原始 error。

**Step 4: Run test to verify it passes**
- Run: `npm test -- --run src/components/Home.test.jsx`

### Task 2: 后端诊断开关测试与实现

**Files:**
- Modify: `backend/app.py`
- Modify: `backend/tests/test_socketio_runtime.py`

**Step 1: Write the failing test**
- 断言后端初始化支持 `logger=` 和 `engineio_logger=` 配置开关。

**Step 2: Run test to verify it fails**
- Run: `uv run pytest tests/test_socketio_runtime.py -v`

**Step 3: Write minimal implementation**
- 读取环境变量，例如 `SOCKETIO_DEBUG=true`，并传给 `socketio.init_app(...)`。

**Step 4: Run test to verify it passes**
- Run: `uv run pytest tests/test_socketio_runtime.py -v`

### Task 3: 回归验证

**Files:**
- Modify: none

**Step 1: Run frontend test**
- Run: `npm test -- --run src/components/Home.test.jsx`

**Step 2: Run backend test**
- Run: `uv run pytest tests/test_socketio_runtime.py -v`

**Step 3: Record usage**
- 在最终说明里给出线上排查时需要设置的环境变量与预期日志。
