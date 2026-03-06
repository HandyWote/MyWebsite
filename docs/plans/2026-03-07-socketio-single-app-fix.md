# SocketIO Single App Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 Flask-SocketIO 命名空间连接被拒绝的问题，确保应用实例只初始化一次，命名空间处理器始终注册在实际运行的 Socket.IO server 上。

**Architecture:** 保持现有命名空间与事件名不变，只消除 `backend/app.py` 中重复的 `create_app()` 调用。通过静态结构测试先卡住“只能存在一个全局 app=create_app()”和“handler 不被后续初始化覆盖”的要求，再做最小代码调整。

**Tech Stack:** Flask, Flask-SocketIO, pytest

---

### Task 1: 结构性失败测试

**Files:**
- Modify: `backend/tests/test_socketio_runtime.py`

**Step 1: Write the failing test**
- 断言 `backend/app.py` 中只存在一个顶层 `app = create_app()`。

**Step 2: Run test to verify it fails**
- Run: `uv run pytest tests/test_socketio_runtime.py -v`

**Step 3: Write minimal implementation**
- 删除重复的顶层 app 初始化，保留唯一全局实例。

**Step 4: Run test to verify it passes**
- Run: `uv run pytest tests/test_socketio_runtime.py -v`

### Task 2: 回归验证

**Files:**
- Modify: none

**Step 1: Run backend test**
- Run: `uv run pytest tests/test_socketio_runtime.py -v`

**Step 2: Record operational validation**
- 说明线上应再观察 `WebSocket /site_blocks connected` 等日志是否出现。
