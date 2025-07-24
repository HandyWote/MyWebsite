# 网站后端

## 🚀 快速启动

### 第一次运行（完整设置）：
```bash
python setup.py
```

### 后续启动（仅启动服务）：
```bash
python setup.py
```

## 📋 功能说明

`setup.py` 会自动完成：
- ✅ 创建配置文件 (.env) - 如果不存在
- ✅ 设置 PostgreSQL 数据库连接
- ✅ 创建数据库表结构
- ✅ 插入示例数据
- ✅ 启动后端服务

## 🔧 配置说明

如需修改配置，编辑项目根目录的 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=n8n
DB_PASSWORD=1234
DB_NAME=mywebsite

# 安全配置
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 上传配置
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=5242880
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,webp

# OpenAI 配置（可选）
OPENAI_API_KEY=sk-xxxx
OPENAI_MODEL=gpt-3.5-turbo

# JWT 有效期
JWT_ACCESS_TOKEN_EXPIRES=86400
JWT_REMEMBER_TOKEN_EXPIRES=604800
```

在 Docker 环境中，应将 `DB_HOST` 设置为 `host.docker.internal` 以连接宿主机上的数据库。

## 📡 API 接口

- **前端 API**: http://localhost:5000/api
- **管理后台**: http://localhost:5000/admin
- **服务地址**: http://localhost:5000

## 🛠️ 依赖安装

```bash
pip install -r requirements.txt
```

## 📝 注意事项

1. 确保 PostgreSQL 已安装并运行
2. 确保 PostgreSQL 用户和密码正确
3. 首次运行会自动创建数据库表结构
4. 在 Docker 环境中使用时，需要特殊配置以确保与 Flask-SocketIO 兼容

## 🐳 Docker 部署

在 Docker 环境中，后端使用 Gunicorn 启动以提高性能和稳定性。Flask-SocketIO 被配置为使用线程模式以避免套接字错误。

## 🔒 安全提醒

1. 生产环境中请务必修改默认的 SECRET_KEY 和 JWT_SECRET_KEY
2. 修改默认的管理员账号密码
3. 不要将敏感信息提交到版本控制系统中