# Go Only Cleanup Design

## 背景
当前仓库已经以 Go 后端为主，但前端仍保留 Socket.IO 连接逻辑，后端仍残留 Python/Flask 实现与测试，导致开发调试噪音和双栈维护成本。

## 目标
1. 前端移除 Socket.IO 协议与连接代码，仅通过 REST API 获取数据。
2. 后端删除 Python 实现与 Python 相关测试/依赖文件，保留 Go 实现。
3. 文档与配置同步为 Go-only 架构。

## 方案对比
1. 仅关闭 socket 开关，不删代码：改动最小，但技术债最大。
2. 迁移到 SSE：长期可用，但本次超范围。
3. 完整 Go-only 清理：一次性改动较大，但后续维护成本最低。

## 选型
采用方案 3（Go-only 清理）。

## 关键改动点
- 前端：删除 `Home` 与各 Admin 管理页中的 `socket.io-client` 连接。
- 前端配置：移除 Vite `/socket.io` 代理与相关分包；移除 `socket.io-client` 依赖。
- API 配置：将 `getApiUrl.websocket()` 语义替换为 `getApiUrl.baseUrl()`。
- 后端：删除 `backend/` 下已跟踪的 Python 代码、测试、依赖文件。
- 文档：更新 README 与 backend/README 的技术栈与启动方式说明。

## 风险与缓解
- 风险：管理页失去“自动刷新”能力。
- 缓解：保留手动刷新、CRUD 后主动刷新逻辑；后续如需实时性，优先评估 SSE。
