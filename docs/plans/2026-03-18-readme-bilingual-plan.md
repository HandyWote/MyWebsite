# 双语言 README 目录结构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 将项目 README 重构为中英文双语言目录结构

**架构：** 采用 `/docs/readme/` 目录存放双语言版本，根目录保留简洁入口

**技术栈：** Markdown

---

### Task 1: 创建 README 目录结构

**Files:**
- Create: `/home/handy/MyWebsite/docs/readme/zh.md`
- Create: `/home/handy/MyWebsite/docs/readme/en.md`

**Step 1: 创建 docs/readme 目录**

```bash
mkdir -p /home/handy/MyWebsite/docs/readme
```

**Step 2: 验证目录创建成功**

Run: `ls -la /home/handy/MyWebsite/docs/readme/`
Expected: 目录存在且为空

---

### Task 2: 编写中文版 README (zh.md)

**Files:**
- Modify: `/home/handy/MyWebsite/docs/readme/zh.md`

**Step 1: 编写中文版完整内容**

```markdown
# MyWebsite 个人网站

Go + React 技术栈构建的个人网站项目，支持文章管理、技能展示、联系方式与评论功能。

## 技术栈

- **后端:** Go + Gin + GORM
- **前端:** React 19 + Vite + MUI
- **数据库:** PostgreSQL + pgvector
- **部署:** Docker Compose + Nginx
- **通信:** REST API

## 快速开始

### 本地开发

```bash
# 启动数据库（Docker）
docker-compose up -d

# 后端开发
cd backend
go run main.go

# 前端开发
cd frontend
npm install
npm run dev
```

访问:
- 前端: http://localhost:3131
- 后端: http://localhost:5000

### Docker 部署

```bash
docker-compose up -d --build
```

访问: http://localhost:4419

## 项目结构

```
MyWebsite/
├── backend/              # Go 后端
│   ├── main.go
│   ├── routes/          # API 路由
│   ├── models/          # 数据模型
│   ├── database/        # 数据库连接
│   └── config/          # 配置管理
├── frontend/            # React 前端
│   ├── src/
│   │   ├── components/  # 公共组件
│   │   ├── admin/       # 管理后台
│   │   └── config/      # 配置
│   ├── nginx.conf
│   └── vite.config.js
├── docs/
│   └── readme/          # 双语言文档
├── docker-compose.yml
└── README.md
```

## API 接口

### 公共接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/articles | 文章列表 |
| GET | /api/articles/:id | 文章详情 |
| GET | /api/skills | 技能列表 |
| POST | /api/contact | 提交联系 |
| POST | /api/comments | 提交评论 |

### 管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/admin/login | 管理员登录 |
| GET/POST/PUT/DELETE | /api/admin/articles | 文章管理 |
| GET/POST/PUT/DELETE | /api/admin/skills | 技能管理 |
| GET/POST/PUT/DELETE | /api/admin/comments | 评论管理 |

## 测试

```bash
# 后端测试
cd backend
go test ./...

# 前端测试
cd frontend
npm run test:run
npm run lint
```

## 环境变量

后端配置 (`backend/.env`):

| 变量 | 描述 | 默认值 |
|------|------|--------|
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 5432 |
| DB_USER | 数据库用户 | postgres |
| DB_PASSWORD | 数据库密码 | - |
| DB_NAME | 数据库名称 | mywebsite |
| JWT_SECRET_KEY | JWT 密钥 | - |
| SECRET_KEY | 应用密钥 | - |

## 许可证

MIT
```

**Step 2: 验证文件内容**

Run: `head -20 /home/handy/MyWebsite/docs/readme/zh.md`
Expected: 显示中文标题和内容

---

### Task 3: 编写英文版 README (en.md)

**Files:**
- Modify: `/home/handy/MyWebsite/docs/readme/en.md`

**Step 1: 编写英文版完整内容**

```markdown
# MyWebsite

A personal website built with Go + React, featuring article management, skills showcase, contact forms, and comments.

## Tech Stack

- **Backend:** Go + Gin + GORM
- **Frontend:** React 19 + Vite + MUI
- **Database:** PostgreSQL + pgvector
- **Deployment:** Docker Compose + Nginx
- **Communication:** REST API

## Quick Start

### Local Development

```bash
# Start database (Docker)
docker-compose up -d

# Backend
cd backend
go run main.go

# Frontend
cd frontend
npm install
npm run dev
```

Access:
- Frontend: http://localhost:3131
- Backend: http://localhost:5000

### Docker Deployment

```bash
docker-compose up -d --build
```

Access: http://localhost:4419

## Project Structure

```
MyWebsite/
├── backend/              # Go backend
│   ├── main.go
│   ├── routes/          # API routes
│   ├── models/          # Data models
│   ├── database/        # Database connection
│   └── config/          # Configuration
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # Public components
│   │   ├── admin/       # Admin dashboard
│   │   └── config/      # Configuration
│   ├── nginx.conf
│   └── vite.config.js
├── docs/
│   └── readme/          # Bilingual docs
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Public API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/articles | List articles |
| GET | /api/articles/:id | Article detail |
| GET | /api/skills | List skills |
| POST | /api/contact | Submit contact |
| POST | /api/comments | Submit comment |

### Admin API

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/login | Admin login |
| GET/POST/PUT/DELETE | /api/admin/articles | Article CRUD |
| GET/POST/PUT/DELETE | /api/admin/skills | Skill CRUD |
| GET/POST/PUT/DELETE | /api/admin/comments | Comment CRUD |

## Testing

```bash
# Backend tests
cd backend
go test ./...

# Frontend tests
cd frontend
npm run test:run
npm run lint
```

## Environment Variables

Backend config (`backend/.env`):

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | - |
| DB_NAME | Database name | mywebsite |
| JWT_SECRET_KEY | JWT secret | - |
| SECRET_KEY | App secret | - |

## License

MIT
```

**Step 2: 验证文件内容**

Run: `head -20 /home/handy/MyWebsite/docs/readme/en.md`
Expected: 显示英文标题和内容

---

### Task 4: 重写根目录 README.md 入口

**Files:**
- Modify: `/home/handy/MyWebsite/README.md`

**Step 1: 重写入口文件为双语言导航**

```markdown
# MyWebsite

个人网站项目 | Personal Website Project

## 简体中文

完整中文文档请访问: [docs/readme/zh.md](docs/readme/zh.md)

## English

Complete English documentation: [docs/readme/en.md](docs/readme/en.md)

---

## 技术栈 | Tech Stack

- Backend: Go + Gin + GORM
- Frontend: React 19 + Vite + MUI
- Database: PostgreSQL

## 快速开始 | Quick Start

```bash
# Docker 部署 | Docker deployment
docker-compose up -d --build

# 访问 | Access: http://localhost:4419
```
```

**Step 2: 验证 README 更新**

Run: `cat /home/handy/MyWebsite/README.md`
Expected: 显示双语言导航内容

---

### Task 5: 更新 CLAUDE.md 中的文档路径引用

**Files:**
- Modify: `/home/handy/MyWebsite/CLAUDE.md`

**Step 1: 检查并更新文档引用**

如 CLAUDE.md 中有提及 README 的地方，更新为指向 `/docs/readme/zh.md`

**Step 2: 验证更新**

Run: `grep -n "README" /home/handy/MyWebsite/CLAUDE.md`
Expected: 如有引用已更新

---

### Task 6: 验证所有链接和内容

**Step 1: 验证目录结构**

Run: `ls -la /home/handy/MyWebsite/docs/readme/`
Expected: 包含 zh.md 和 en.md

**Step 2: 验证 README 入口**

Run: `grep -E "(zh\.md|en\.md)" /home/handy/MyWebsite/README.md`
Expected: 包含两个文档的链接

**Step 3: 提交更改**

```bash
git add docs/readme/ README.md
git commit -m "docs: 添加中英文双语言 README"
```

---

**Plan complete and saved to `docs/plans/2026-03-18-readme-bilingual-plan.md`.**

Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
