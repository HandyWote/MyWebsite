# MyWebsite

Go + React 的个人网站项目，前后端分离，支持文章、技能、联系方式、评论与管理后台。

## 技术栈

- 后端: Go + Gin + GORM
- 前端: React 19 + Vite + MUI
- 数据库: PostgreSQL
- 部署: Docker Compose + Nginx
- 通信: REST API（已移除 Socket.IO）

## 项目结构

```text
MyWebsite/
├── backend/              # Go 后端
│   ├── main.go
│   ├── routes/
│   ├── models/
│   ├── database/
│   └── config/
├── frontend/             # React 前端
│   ├── src/
│   ├── nginx.conf
│   └── vite.config.js
├── docker-compose.yml
└── README.md
```

## 本地开发

### 后端

```bash
cd backend
go run main.go
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## 测试

### 后端

```bash
cd backend
go test ./...
```

### 前端

```bash
cd frontend
npm run test:run
npm run lint
```

## Docker

```bash
docker compose up -d --build
```

- 前端: `http://localhost:4419`
- 后端健康检查: `http://localhost:5000/health`
