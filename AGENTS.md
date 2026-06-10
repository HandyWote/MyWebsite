# AGENTS.md

本文件是基于当前代码重新生成的仓库协作说明。回复请使用中文。

## 顶层规则

- 使用项目中已有组件、工具和风格，除非确有必要，不要另起炉灶。
- 不要在没有用户明确指令时修改业务代码；讨论方案时提供多个方案，并推荐未来技术债最低的方案。
- 采用 TDD / REG 思路：先用测试或现有契约描述预期，再实现，再跑相关测试。
- 用户偏好低技术债方案，但实际改动应控制风险，优先小步提交。
- 如环境提供 `superpower` skill，必须使用；当前 Codex 技能列表中没有该 skill 时，说明不可用并继续用本地仓库上下文推进。
- DONT USE CO-AUTHORED-BY WHEN COMMIT

## 当前仓库定位

这是一个个人网站仓库，实际是三个端协同：

- `3Dend/`：第一入口和外壳端，Three.js / TypeScript。用户打开站点根路径时先进入这个 3D 场景，看到一台电脑模型。
- `frontend/`：电脑屏幕内运行的网页端，React 19 + Vite + MUI + Zustand，包含公开主页和 `/admin` 管理后台。
- `backend/`：数据/API 端，Go + Gin + GORM + PostgreSQL，提供 REST API、认证、文章、评论、站点内容块、头像、AI 设置和导入导出。
- `deploy/`、`docker-compose.yml`：生产构建与 Nginx/Docker 编排。生产镜像会把 `3Dend/dist` 放到 Nginx 根目录，把 `frontend/dist` 放到 `/app/`。
- `docs/plans/`：历史计划文档，可能反映旧方案，改动前应以当前代码为准。

用户体验链路是：

```text
浏览器打开站点 /
  -> 进入 3Dend Three.js 场景
  -> 看到电脑/显示器模型
  -> 鼠标聚焦到电脑屏幕
  -> MonitorScreen 创建的 iframe 展示 frontend 页面
  -> frontend 通过 /api 和 /uploads 访问 backend
```

也就是说，对用户来说这是“在一个 3D 网页里打开一台电脑，电脑屏幕里又启动了一个网页”。不要把 `3Dend` 理解为无关实验项目；它是主体验入口，`frontend` 是被嵌入到电脑屏幕里的应用层。

## 常用命令

### Backend

```bash
cd backend
go mod tidy
go run main.go
go test ./...
go test ./routes -v
go test -run TestName ./...
```

后端默认监听 `5000` 端口。配置来自 `backend/.env` 和环境变量。

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run lint
npm run test
npm run test:run
```

`frontend` 开发服务器监听 `3131`，`vite.config.js` 将 `/api` 和 `/uploads` 代理到 `http://localhost:5000` 或 `VITE_API_BASE_URL`。在 3D 端带 `?dev` 运行时，电脑屏幕 iframe 会加载 `http://localhost:3131/`。

### 3Dend

```bash
cd 3Dend
npm install
npm run dev
npm run build
npm test
```

`3Dend` 是主入口端。生产中 `MonitorScreen` 的 iframe 加载 `/app/`；开发时如果 URL 带 `?dev`，iframe 加载 `http://localhost:3131/`，因此调试完整体验通常需要同时运行 `3Dend`、`frontend` 和 `backend`。

### Docker

```bash
docker-compose up -d
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose down
```

当前 `docker-compose.yml` 默认启动 `backend` 和一个 Nginx `frontend` 容器，PostgreSQL 服务块被注释掉。后端通过 `host.docker.internal` 访问外部或本机数据库。Nginx 容器对外暴露 `4419:80`，其中根路径 `/` 服务 `3Dend`，`/app/` 服务 `frontend`，`/api` 和 `/uploads` 反代到 `backend`。

## 3Dend 结构和职责

`3Dend` 是用户第一眼看到的端，也是生产根路径 `/` 的 SPA。它负责 3D 场景、电脑模型、相机交互，以及把 `frontend` 嵌入电脑屏幕。

关键文件：

```text
3Dend/src/script.ts                         # 3D 端入口
3Dend/src/Application/Application.ts        # 应用编排：scene、cssScene、camera、renderer、resources
3Dend/src/Application/Renderer.ts           # WebGLRenderer + CSS3DRenderer
3Dend/src/Application/World/World.ts        # 场景对象组合
3Dend/src/Application/World/Computer.ts     # 电脑模型
3Dend/src/Application/World/MonitorScreen.ts # 电脑屏幕 iframe 与 CSS3D 平面
3Dend/src/Application/Camera/Camera.ts      # 鼠标聚焦屏幕时的相机行为
3Dend/src/Application/sources.ts            # 模型/贴图资源清单
```

`World` 在资源 ready 后创建 `Environment`、`Decor`、`ComputerSetup` 和 `MonitorScreen`。`MonitorScreen` 创建 `id="computer-screen"` 的 iframe，并通过 CSS3DObject 放到显示器位置；同时创建透明 WebGL plane 做遮挡。它还会把 iframe 内的鼠标/键盘消息转成主 3D 应用事件，用于相机进入/离开屏幕聚焦状态。

iframe 路径规则：

- 生产：`iframe.src = "/app/"`，加载 Nginx 中的 `frontend/dist`。
- 开发：访问 3D 端时带 `?dev`，iframe 改为 `http://localhost:3131/`。

部署构建规则在 `deploy/Dockerfile.web`：

```text
3Dend build    -> /usr/share/nginx/html/
frontend build -> /usr/share/nginx/html/app/
```

## 后端结构和职责

```text
backend/
├── config/        # 环境配置加载
├── database/      # GORM/PostgreSQL 连接与 DSN
├── middleware/    # JWT、CORS
├── migrations/    # 启动时补列迁移
├── models/        # Article、Comment、Skill、Contact、Avatar、SiteBlock、AISetting
├── routes/        # Gin handlers 和路由注册，当前仍承载较多业务逻辑
├── services/      # 当前主要是 AI 服务
├── utils/         # 响应工具
└── main.go        # 启动、AutoMigrate、seedData、SetupRoutes
```

### 实际路由入口

所有路由注册在 `backend/routes/routes.go`。

公开路由：

- `GET /health`
- `GET /robots.txt`
- `GET /sitemap.xml`
- `GET /uploads/*`
- `GET /api/articles`
- `GET /api/articles/:id`
- `GET /api/articles/:id/comments`
- `POST /api/articles/:id/comments`
- `GET /api/articles/pdf/:filename`
- `GET /api/categories`
- `GET /api/tags`
- `GET /api/site-blocks`
- `GET /api/avatars`
- `GET /api/avatars/file/:filename`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/admin/login`
- `POST /api/admin/logout`

管理路由统一挂在 `/api/admin`，并使用 `middleware.JWTAuth(cfg.JWTSecretKey)`：

- 认证：`GET /verify`、`GET /auth/me`
- Site Blocks：`GET|POST|PUT /site-blocks`、`DELETE /site-blocks/:id`
- Avatars：`GET|POST /avatars`、`PUT /avatars/:id/set_current`、`DELETE /avatars/:id`
- Articles：`GET|POST /articles`、`GET|PUT|DELETE /articles/:id`、批量删除、封面上传、PDF 上传、Markdown 导入
- Comments：`GET /comments`、`GET /comments/export`、`GET /comments/limits`、`DELETE /comments/:id`、`PUT /comments/:id`、`PUT /comments/:id/status`
- AI：文章分析、`GET|PUT /ai-settings`、`POST /ai-settings/test`
- Data：`GET /export`、`POST /import`、`GET /stats`

注意：`routes/public.go` 和 `routes/admin_article.go` 里仍有 skills/contacts handler，但当前 `routes.go` 没有注册 `/api/skills`、`/api/contacts`、`/api/admin/skills`、`/api/admin/contacts`。不要只凭函数存在判断 API 可用。

### 后端当前边界

- `routes` 层不只是 HTTP 适配，很多 handler 直接做参数解析、数据库访问、DTO 拼装和业务规则。
- `services/ai.go` 是当前主要 service；文章、评论、SiteBlock、头像等大多还没有独立 service/repository。
- `main.go` 会 AutoMigrate 所有模型，并执行 `migrations.RunMigrations`。
- `seedData` 仍会在空表时插入初始 SiteBlock、Skill、Contact。

## 前端结构和职责

`frontend` 是电脑屏幕内的网页应用层，不是生产根路径的第一屏。生产中它被构建到 `/app/`，由 `3Dend/src/Application/World/MonitorScreen.ts` 创建的 iframe 加载。

```text
frontend/src/
├── App.jsx                  # React Router 顶层路由，公开站点 + /admin
├── admin/                   # 管理后台路由、登录守卫、管理页面
├── components/              # 公开站点组件
├── components/layout/       # MainLayout
├── components/pixel/        # 当前视觉 token / PixelProvider
├── components/sidebar/      # Sidebar 子组件
├── config/                  # API URL、站点内容块配置
├── hooks/                   # 旧 useApi hook 仍存在
├── stores/                  # Zustand store，目前主要是 articleStore
├── test/                    # Vitest setup
└── utils/                   # apiClient、错误处理、icon 映射
```

### 公开站点

`frontend/src/App.jsx` 使用懒加载路由。这个路由树在用户体验上显示于 3D 电脑屏幕内：

- `MainLayout` 包住公开站点。
- 默认跳转到 `articles`。
- `ContentTabs` 下包含 `ArticleList` 和 `ProjectList`。
- `articles/:id` 渲染 `ArticleDetail`。
- `PixelProvider` 是全局视觉上下文。

### 管理后台

`frontend/src/admin/routes.jsx` 定义 `/admin/*`：

- `/admin/login`：登录页。
- 其他后台页面由 `RequireAuth` 包裹，进入 `AdminLayout`。
- 默认跳转 `/admin/sidebar`。
- 当前 tab：`Sidebar`、`Articles`、`Comments`。
- `DataImportExport` 组件存在并注册了 `/admin/data` 路由，但 `AdminLayout` 的 tab 列表目前没有入口。

### 前端 API 现状

当前不是单一 API 层：

- `frontend/src/config/api.js`：维护 `API_CONFIG`、`API_ENDPOINTS`、`getApiUrl`、响应解包工具，并导入 `siteBlocks` 辅助。
- `frontend/src/utils/apiClient.js`：另一套轻量 `fetch` client 和一份重复的 `API_ENDPOINTS`，主要被 `articleStore` 使用。
- `frontend/src/hooks/useApi.js`：旧 hook 仍存在，并有测试。
- 多个组件仍直接使用 `fetch` + `getApiUrl`。

因此修改 API 时要先查调用点和 `backend/routes/routes.go`，不要假设某一层已经统一，也不要假设 endpoint 配置一定有后端路由。例如 `config/api.js` 里有 `ARTICLE_PDF_DELETE`，但当前后端未注册对应删除 PDF 路由。更低债方向是逐步收敛到 `frontend/src/api/*` 或统一复用现有 `config/api.js` / `utils/apiClient.js` 中的一层。

### 文章与 AI 状态

`frontend/src/stores/articleStore.js` 同时管理：

- 文章列表、分页、CRUD
- 封面/PDF 上传
- Markdown 导入
- AI 分析
- AI 设置和连接测试

这是当前真实状态。拆分 `articleApi`、`aiApi`、`articleStore`、`aiStore` 时要先补契约测试，避免改散后台文章编辑流程。

## SiteBlock 内容模型

后端模型 `SiteBlock.Content` 是 JSON 字符串。公开接口 `buildPublicSiteBlockPayload` 会解析 `content`，并把非保留字段拍平到顶层，同时保留 `content` 字段。

这意味着前端可能同时存在两种读取方式：

```js
block.content.title
block.title
```

改 SiteBlock schema 时要先搜索前端读取方式，并用测试锁定兼容行为。未来低债方向是定义明确 schema，并统一前端读取 `block.content.xxx`。

## 测试现状

- 后端有路由、模型、配置、数据库、中间件、迁移相关 Go 测试。
- 前端有 Vitest + Testing Library，覆盖公开组件、后台组件、store、config、utils。
- 3Dend 有 Jest 测试。

改动建议：

- 后端 handler 行为变化：优先添加或更新 `backend/routes/*_test.go`。
- 前端组件行为变化：优先添加或更新相邻 `*.test.jsx`。
- Store/API 行为变化：优先添加或更新 `frontend/src/stores/*.test.js`、`frontend/src/config/*.test.js`、`frontend/src/utils/*.test.js`。

## 工作准则

- 先读实际代码，再相信文档。`docs/plans/` 和 README 可能过期。
- 搜索优先使用 `rg`；如果环境没有 `rg`，使用 `find` / `grep`。
- 不要把 `3Dend/` 当成可忽略的实验目录；它是生产根路径和第一视觉入口。改主体验、部署入口、iframe 嵌入、路径前缀或首页体验时必须同时考虑 `3Dend` 和 `frontend`。
- 不要删除历史兼容路径，除非有测试证明调用方已经迁移。
- 不要一次性做大重构。推荐顺序是先补契约测试，再抽 API/service，再迁移调用点。
- 涉及前端 UI 时，优先复用 MUI、lucide-react 和已有 `components/pixel` token。
- 涉及上传、静态文件和路径拼接时，注意路径清理和越权访问风险。

## 推荐重构路线

### 方案 A：低风险文档/边界校准

- 更新 README/API 文档，让它和三端体验链路、`routes.go`、`App.jsx`、`admin/routes.jsx`、`MonitorScreen.ts`、Nginx 路径一致。
- 标注未注册但仍存在的 legacy handler。
- 明确 `3Dend` 是根路径入口，`frontend` 是 `/app/` 内嵌应用。

适合先降低认知成本。

### 方案 B：前端 API 层收敛

- 先为现有 `config/api.js`、`utils/apiClient.js`、`articleStore.js` 补测试。
- 引入或统一领域 API：`articleApi`、`commentApi`、`siteBlockApi`、`aiApi`。
- 逐步把组件内直接 `fetch` 迁移到领域 API。

收益大，风险中等，是主站前端低债方向。

### 方案 C：后台评论模块拆分

- 先抽 `commentApi` 和评论状态/导出逻辑测试。
- 再拆 `CommentsManager.jsx` 为 toolbar、stats、list/card、detail dialog、delete dialog 和 hook/store。

适合减少后台页面复杂度。

### 方案 D：后端 route/service 分层

- 先按领域拆 route 文件，保持 handler 行为不变。
- 再在测试保护下抽 service/repository。
- 优先处理 comments、articles、siteBlocks，AI 设置可独立成 `ai_config_service`。

长期技术债最低，但初期改动更大。
