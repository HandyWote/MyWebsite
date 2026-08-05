# MyWebsite 个人网站

基于 Go API、Next.js 前端、服务端 SEO 内容和桌面 Three.js 公开体验的个人网站。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 后端 | Go 1.25 + Gin + GORM |
| 前端 | Next.js 16 App Router + React 19 + MUI |
| 3D 体验 | 集成在 `frontend/src/three` 的 Three.js 运行时 |
| 数据库 | PostgreSQL + pgvector |
| 部署 | Docker Compose: edge Nginx、Next standalone、Go API |
| 通信 | REST API 和内部 Next revalidation 事件 |

## 本地开发

启动后端：

```bash
cd backend
go run main.go
```

启动前端：

```bash
cd frontend
npm ci
npm run dev
```

默认本地服务：

| 服务 | URL |
| --- | --- |
| 后端 API | `http://localhost:5000` |
| Next 前端 | `http://localhost:3000` |
| Docker edge | `http://localhost:4419` |

浏览器 API 请求保持相对路径 `/api`。Next Server Components 和 rewrites 使用 `BACKEND_INTERNAL_URL`。

## Docker 部署

```bash
docker compose up -d --build
docker compose logs -f backend next-web edge-nginx
docker compose down
```

生产拓扑：

```text
edge-nginx:4419
  -> next-web:3000 处理公开页面、admin、robots 和 sitemap
  -> backend:5000 处理 /api、/uploads 和 /health
```

`/internal/*` 不通过 edge Nginx 对外暴露。后端刷新缓存应使用 `NEXT_REVALIDATION_URL=http://next-web:3000/internal/revalidate` 和共享的 `REVALIDATION_TOKEN`。

## 项目结构

```text
MyWebsite/
├── backend/              # Go API、repositories、services、storage、migrations
├── frontend/
│   ├── app/              # Next App Router 路由
│   ├── e2e/              # Playwright 浏览器检查
│   ├── public/           # 公共资源，包括 /3d
│   └── src/              # 管理后台、公开组件、API helpers、Three runtime
├── docs/                 # 文档和计划
├── docker-compose.yml    # edge-nginx + next-web + backend 拓扑
├── nginx.edge.conf       # edge 反向代理
└── AGENTS.md             # 仓库协作指令
```

## API 面

Go 提供的公开 API：

| 方法 | 路径 | 描述 |
| --- | --- | --- |
| GET | `/api/articles` | 文章列表 |
| GET | `/api/articles/:id` | 文章详情 |
| GET | `/api/articles/:id/comments` | 文章评论 |
| POST | `/api/articles/:id/comments` | 提交评论 |
| GET | `/api/categories` | 分类 |
| GET | `/api/tags` | 标签 |
| GET | `/api/site-blocks` | 公开站点区块 |
| GET | `/api/avatars` | 头像列表 |
| GET | `/api/avatars/file/*key` | 头像媒体 |
| GET | `/api/articles/pdf/*key` | 文章 PDF 媒体 |
| GET | `/health` | 后端健康检查 |

Next 提供 SEO 路由：

| 路径 | 所有者 |
| --- | --- |
| `/` | Next |
| `/articles` | Next |
| `/articles/:id` | Next |
| `/projects` | Next |
| `/robots.txt` | Next |
| `/sitemap.xml` | Next |

## 验证

后端：

```bash
cd backend
go test ./...
go vet ./...
```

前端：

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
```

## 配置

部署前复制并填写环境模板：

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

生产环境必须覆盖管理员账号、JWT/application secret、`REVALIDATION_TOKEN`、数据库配置、公开站点域名和 storage/S3 配置。
