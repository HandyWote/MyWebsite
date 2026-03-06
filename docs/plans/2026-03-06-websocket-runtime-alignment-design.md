# WebSocket Runtime Alignment Design

**问题**

生产环境出现多个 Socket.IO 命名空间连接报错，现象集中在 `/site_blocks`、`/skills`、`/contacts`、`/avatars`。仓库内最明显的配置冲突是：Docker 使用 `gunicorn --worker-class eventlet` 启动，但后端在检测到 gunicorn 后把 Flask-SocketIO 强制初始化为 `async_mode='threading'`。

**目标**

在不改变现有事件模型和命名空间结构的前提下，消除运行时配置冲突，恢复生产环境下的 Socket.IO 连接能力，并保留 `*_updated` 事件驱动的数据刷新。

**备选方案**

1. 统一到 `eventlet`
   - 保持 Docker/Gunicorn 启动方式不变，移除后端对 `threading` 的强制覆盖。
   - 优点：改动最小，和现有部署对齐，技术债最低。
   - 缺点：仍需验证外层代理链路。

2. 统一到 `threading`
   - 保留后端 `threading`，改 Docker 启动方式，不再使用 `eventlet worker`。
   - 优点：运行模型更朴素。
   - 缺点：牵涉部署基线调整，验证面更大。

3. 前端退回 polling 优先
   - 保留现状，仅放宽客户端传输策略，尽量靠轮询兜底。
   - 优点：止血快。
   - 缺点：没有解决根因，技术债最高。

**推荐方案**

采用方案 1，并增加一个低风险兜底：将管理页客户端传输策略从仅 `websocket` 放宽到 `['websocket', 'polling']`。这样优先恢复正确的 WebSocket 运行模式，同时在代理链路偶发不稳定时仍可通过 Socket.IO fallback 保持更新监听。

**设计范围**

- 后端：
  - 调整 Socket.IO 初始化逻辑，使其与 `eventlet` worker 一致。
  - 不改命名空间、不改事件名、不改业务 emit 逻辑。
- 前端：
  - 首页已有 `['websocket', 'polling']`，保持不变。
  - 管理页四个组件改为允许 polling fallback。
- 测试：
  - 先补后端测试，证明生产模式下不再强制 `threading`。
  - 补前端测试，证明管理页连接配置允许 fallback。

**成功标准**

- 后端测试能覆盖生产运行模式配置。
- 前端测试能覆盖管理页 Socket.IO 连接参数。
- 现有 `site_block_updated`、`skills_updated`、`contacts_updated`、`avatars_updated` 监听逻辑不被移除。
