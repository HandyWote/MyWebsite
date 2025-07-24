# Docker部署指南

本指南将帮助您使用Docker容器化部署HandyWote个人网站项目。

## 目录结构

```
handywote/
├── Dockerfile.frontend          # 前端生产环境Dockerfile
├── Dockerfile.frontend-dev      # 前端开发环境Dockerfile
├── Dockerfile.backend           # 后端生产环境Dockerfile
├── Dockerfile.backend-dev       # 后端开发环境Dockerfile
├── docker-compose.yml           # 生产环境编排文件
├── docker-compose.override.yml  # 开发环境编排文件
├── nginx.conf                   # Nginx配置文件
├── .dockerignore                # Docker忽略文件
├── build-docker.sh              # Linux/Mac构建脚本
├── build-docker.bat             # Windows构建脚本
└── .env.example                 # 环境变量示例文件
```

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd handywote
```

### 2. 配置环境变量

复制并修改环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件以适应您的配置需求，特别是数据库连接信息。

### 3. 构建Docker镜像

所有Docker配置已默认使用国内镜像源，包括：
- Debian系统更新源：阿里云镜像
- Python包管理：清华大学PyPI镜像
- Node.js包管理：淘宝npm镜像
- Alpine Linux镜像源：阿里云镜像

直接构建即可：
```bash
docker-compose build
```

### 4. 生产环境部署

```bash
docker-compose up -d
```

访问 `http://localhost` 查看应用。

### 5. 开发环境部署

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

访问 `http://localhost:5173` 查看开发环境的前端应用。
访问 `http://localhost:5000` 查看开发环境的后端API。

## 服务说明

### 后端 (Flask)
- 端口: 5000
- 依赖: Python 3.11 with requirements from `backend/requirements.txt`
- 数据卷: 挂载 `./backend/uploads` 用于文件上传
- 用户: 使用非root用户运行以提高安全性
- 数据库: 连接到database服务
- 启动方式: 
  - 生产环境: 使用Gunicorn启动应用
  - 开发环境: 使用setup.py启动应用
- 健康检查: 内置健康检查机制

### 前端 (React + Vite)
- 端口: 80 (生产环境) 或 5173 (开发环境)
- 构建: 多阶段构建，生产环境使用nginx服务器
- 路由: 支持React Router的SPA路由
- 代理: API请求代理到后端服务
- 健康检查: 内置健康检查机制

## 环境变量

环境变量配置了应用的基本设置和敏感信息，主要通过 `.env` 文件进行配置，docker-compose 会自动加载该文件。

### 基础配置
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| DB_HOST | host.docker.internal | 数据库主机（指向宿主机） |
| DB_PORT | 5432 | 数据库端口 |
| DB_USER | postgres | 数据库用户名 |
| DB_PASSWORD | password | 数据库密码 |
| DB_NAME | mywebsite | 数据库名称 |

### 安全配置
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| SECRET_KEY | dev-secret-key-change-in-production | Flask应用密钥，用于会话加密 |
| JWT_SECRET_KEY | dev-jwt-secret-change-in-production | JWT令牌加密密钥 |
| ADMIN_USERNAME | admin | 管理员登录用户名 |
| ADMIN_PASSWORD | admin123 | 管理员登录密码 |

### 邮件配置（可选）
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| MAIL_SERVER | smtp.example.com | 邮件服务器地址 |
| MAIL_PORT | 587 | 邮件服务器端口 |
| MAIL_USE_TLS | True | 是否使用TLS加密 |
| MAIL_USERNAME | your@email.com | 邮件发送账户 |
| MAIL_PASSWORD | yourpassword | 邮件账户密码 |
| MAIL_DEFAULT_SENDER | your@email.com | 默认发件人地址 |

### 其他配置
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| DEBUG | False | 调试模式开关，生产环境应设为False |
| LOG_LEVEL | INFO | 日志记录级别（DEBUG, INFO, WARNING, ERROR, CRITICAL） |
| RATELIMIT_DEFAULT | 200 per day,50 per hour | API请求限流设置 |
| RATELIMIT_STORAGE_URI | memory:// | 限流存储方式，可设置为redis://等

## 网络配置

所有服务都在同一个Docker网络 `handywote_network` 中，可以使用服务名称进行通信。

## 故障排除

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
```

### 重建服务

```bash
# 重建所有服务
docker-compose up --build

# 重建特定服务
docker-compose build backend
```

### 停止和清理

```bash
# 停止所有服务
docker-compose down
```

## 国内镜像源配置

为了提高在中国大陆地区的构建和部署速度，项目已全面配置国内镜像源：

### 基础镜像源
- Debian系统更新源：阿里云镜像 (mirrors.aliyun.com)
- Alpine Linux镜像源：阿里云镜像 (mirrors.aliyun.com)

### 包管理器镜像源
- Python pip：清华大学PyPI镜像 (pypi.tuna.tsinghua.edu.cn)
- Node.js npm：淘宝npm镜像 (registry.npmmirror.com)

### Docker镜像仓库
所有基础镜像均使用国内可访问的版本，包括:
- node:18-alpine
- python:3.11-slim
- postgres:15-alpine
- nginx:alpine

## 网络连接问题解决方案

如果在构建Docker镜像时遇到网络连接问题（如registry-1.docker.io连接超时），可以尝试以下解决方案：

### 1. 使用国内镜像源加速构建

项目已默认配置国内镜像源，无需额外操作。

### 2. 配置Docker代理

如果在企业网络环境中，可能需要配置Docker使用代理：

1. 创建或编辑 `~/.docker/config.json` 文件：
```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.company.com:8080",
      "httpsProxy": "http://proxy.company.com:8080",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
```

## 安全考虑

1. 生产环境请务必更改默认的密钥和密码
2. 前后端服务使用非root用户运行
3. 使用健康检查确保服务依赖顺序
4. 确保数据库连接使用安全的密码

## 自定义配置

### 修改Nginx配置
编辑 [nginx.conf](file:///e:/MyWebsite/nginx.conf) 文件以自定义nginx配置，如添加SSL支持、自定义头部等。

### 修改Dockerfile
根据需要修改相应的Dockerfile以安装额外的依赖或调整配置。

## 生产环境部署建议

1. 使用反向代理（如nginx）处理SSL终止
2. 配置适当的资源限制
3. 定期备份数据库（数据库在宿主机上）
4. 使用强密码和密钥
5. 启用日志轮转
6. 配置监控和告警

## 连接本地数据库说明

由于您使用本地数据库，Docker容器通过 `host.docker.internal` 主机名访问宿主机上的PostgreSQL服务。请确保：

1. PostgreSQL服务正在运行
2. PostgreSQL配置允许来自Docker容器的连接（postgresql.conf中的listen_addresses和pg_hba.conf）
3. 防火墙允许Docker容器访问PostgreSQL端口（默认5432）
4. 提供的数据库凭据正确无误

## 后端启动方式说明

项目提供了两种后端启动方式以适应不同环境：

### 开发环境
使用 [setup.py](file://e:\MyWebsite\backend\setup.py#L0-L307) 作为入口点，提供交互式设置和启动选项。

### 生产环境
使用Gunicorn作为WSGI服务器启动应用，提供更好的性能和稳定性：
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

这种配置确保了在生产环境中使用专业的WSGI服务器，而在开发环境中保持原有的交互式设置流程。