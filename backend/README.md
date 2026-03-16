# 网站后端（Go）

## 🚀 本地启动

```bash
cd backend
go run main.go
```

默认端口 `5000`，可通过环境变量 `PORT` 覆盖。

## 🧪 测试

```bash
cd backend
go test ./...
```

## 🐳 Docker

```bash
cd backend
docker build -t mywebsite-backend .
```

## 🔧 环境变量

核心变量（读取 `backend/.env`）：

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET_KEY`
- `SECRET_KEY`

## 📡 接口

- 健康检查: `GET /health`
- 公共 API: `GET /api/*`
- 管理 API: `GET/POST/PUT/DELETE /api/admin/*`
