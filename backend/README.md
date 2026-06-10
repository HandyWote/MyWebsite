# 后端服务

## 本地开发

```bash
# 复制环境变量模板
cp .env.example .env

# 根据本地环境修改 .env（默认连接 localhost:5432）

# 启动开发服务器
go run main.go
```

默认监听 `5000` 端口。配置来自 `backend/.env`（通过 godotenv 加载）。

## 测试

```bash
go test ./...
```

## Docker 构建

```bash
docker build -t mywebsite-backend .
```

## 环境变量

所有变量均在 `backend/.env` 中配置，参见 `.env.example`：

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `5000` | 服务监听端口 |
| `DB_HOST` | `localhost` | 数据库主机 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_USER` | `postgres` | 数据库用户名 |
| `DB_PASSWORD` | `password` | 数据库密码 |
| `DB_NAME` | `mywebsite` | 数据库名 |
| `SECRET_KEY` | `dev-secret-key-change-in-production` | 应用密钥（⚠️ 生产环境务必修改） |
| `JWT_SECRET_KEY` | `dev-jwt-secret-change-in-production` | JWT 签名密钥（⚠️ 生产环境务必修改） |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | `admin123` | 管理员密码（⚠️ 生产环境务必修改） |
| `UPLOAD_FOLDER` | `uploads` | 上传文件目录 |
| `MAX_CONTENT_LENGTH` | `52428800` | 最大上传大小（字节，默认 50MB） |
| `ALLOWED_IMAGE_EXTENSIONS` | `jpg,jpeg,png,webp` | 允许的图片格式 |
| `OPENAI_API_KEY` | _(空)_ | OpenAI API 密钥 |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI 模型 |
| `OPENAI_API_URL` | `https://api.openai.com/v1` | OpenAI API 地址 |
| `JWT_ACCESS_TOKEN_EXPIRES` | `86400` | Access Token 有效期（秒） |
| `JWT_REMEMBER_TOKEN_EXPIRES` | `604800` | Remember Token 有效期（秒） |
| `COMMENT_LIMIT_ENABLED` | `true` | 是否启用评论限制 |
| `COMMENT_LIMIT_TIME_WINDOW` | `24` | 评论限制时间窗口（小时） |
| `COMMENT_LIMIT_MAX_COUNT` | `1` | 时间窗口内最大评论数 |
| `COMMENT_LIMIT_EXEMPT_ADMIN` | `true` | 管理员是否免于评论限制 |

## API 端点

- 健康检查: `GET /health`
- 公共 API: `GET /api/*`
- 管理后台 API: `/api/admin/*`
