# WebSocket Runtime Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 对齐 Flask-SocketIO 与生产 Gunicorn worker 的运行模式，恢复命名空间连接，并为管理页补上 polling fallback。

**Architecture:** 后端保持现有多命名空间与事件模型不变，只修正 Socket.IO 初始化策略，使其与 `eventlet` worker 一致。前端不重构实时机制，仅将管理页的 Socket.IO 连接配置从只允许 websocket 调整为允许 websocket/polling 双传输，以降低代理链路波动带来的连接失败概率。

**Tech Stack:** Flask, Flask-SocketIO, Gunicorn, eventlet, React 19, Vite, Vitest, socket.io-client

---

### Task 1: 后端生产运行模式测试

**Files:**
- Modify: `backend/tests/`
- Create: `backend/tests/test_socketio_runtime.py`

**Step 1: Write the failing test**

```python
def test_gunicorn_runtime_does_not_force_threading(monkeypatch):
    monkeypatch.setenv("SERVER_SOFTWARE", "gunicorn/23.0.0")
    ...
    assert captured["async_mode"] != "threading"
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest backend/tests/test_socketio_runtime.py -v`
Expected: FAIL because current implementation passes `async_mode='threading'`

**Step 3: Write minimal implementation**

调整 `backend/app.py` 中 Socket.IO 初始化逻辑，移除 gunicorn 下对 `threading` 的强制指定。

**Step 4: Run test to verify it passes**

Run: `uv run pytest backend/tests/test_socketio_runtime.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app.py backend/tests/test_socketio_runtime.py
git commit -m "fix(backend): align socketio runtime with gunicorn worker"
```

### Task 2: 管理页 fallback 连接测试

**Files:**
- Modify: `frontend/src/admin/components/`
- Create: `frontend/src/admin/components/AdminRealtimeSockets.test.jsx`

**Step 1: Write the failing test**

```jsx
it('uses websocket and polling transports for admin realtime sockets', () => {
  expect(io).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
    transports: ['websocket', 'polling'],
  }));
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- AdminRealtimeSockets.test.jsx`
Expected: FAIL because current admin components only pass `['websocket']`

**Step 3: Write minimal implementation**

修改以下文件中的 `io(..., { transports })`:
- `frontend/src/admin/components/SiteContentEditor.jsx`
- `frontend/src/admin/components/SkillsManager.jsx`
- `frontend/src/admin/components/ContactsManager.jsx`
- `frontend/src/admin/components/AvatarsManager.jsx`

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- AdminRealtimeSockets.test.jsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/admin/components/*.jsx frontend/src/admin/components/AdminRealtimeSockets.test.jsx
git commit -m "fix(frontend): allow polling fallback for admin realtime sockets"
```

### Task 3: 回归验证

**Files:**
- Modify: none

**Step 1: Run targeted backend tests**

Run: `uv run pytest backend/tests/test_socketio_runtime.py -v`
Expected: PASS

**Step 2: Run targeted frontend tests**

Run: `cd frontend && npm test -- AdminRealtimeSockets.test.jsx`
Expected: PASS

**Step 3: Run existing relevant frontend test**

Run: `cd frontend && npm test -- Home.test.jsx`
Expected: PASS

**Step 4: Summarize residual risk**

记录仍未在本地覆盖的部分：
- 外层 Nginx 配置
- Cloudflare 真实链路
- 生产日志验证

**Step 5: Commit**

```bash
git add docs/plans/2026-03-06-websocket-runtime-alignment*.md
git commit -m "docs: add websocket runtime alignment plan"
```
