# MyWebsite 个人网站

Go + React 技术栈构建的个人网站项目，支持文章管理、技能展示、联系方式与评论功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go + Gin + GORM |
| 前端 | React 19 + Vite + MUI |
| 数据库 | PostgreSQL + pgvector |
| 部署 | Docker Compose + Nginx |
| 通信 | REST API |

## 快速开始

### 本地开发

#### 1. 启动数据库（Docker）

```bash
docker-compose up -d
```

仅启动 PostgreSQL 数据库，后端和前端直接在本机运行。

#### 2. 启动后端

```bash
cd backend
go run main.go
# 或使用 debug 模式
go run main.go --debug
```

后端服务运行在 http://localhost:5000

#### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器运行在 http://localhost:3131

#### 服务通信

- 前端：http://localhost:3131
- 后端：http://localhost:5000
- 数据库：PostgreSQL 运行在 Docker 中

前端使用 Vite 代理自动将 `/api`、`/uploads` 请求转发到后端（参见 `vite.config.js`），无需配置 CORS。

### Docker 部署

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 停止服务
docker-compose down
```

部署后通过 Nginx 访问，端口 4419。

## 项目结构

```
MyWebsite/
├── backend/                    # Go 后端服务
│   ├── config/                 # 配置管理
│   │   └── config.go
│   ├── database/              # 数据库连接
│   │   └── database.go
│   ├── middleware/             # 中间件
│   │   └── middleware.go
│   ├── models/                 # 数据模型
│   │   └── models.go
│   ├── routes/                 # API 路由
│   │   ├── admin_article.go    # 文章管理
│   │   ├── admin_comment_extra.go
│   │   ├── admin_extra.go
│   │   ├── admin_siteblock.go
│   │   ├── ai.go              # AI 分析
│   │   ├── article.go         # 文章接口
│   │   ├── auth.go            # 认证接口
│   │   ├── category_tag.go    # 分类标签
│   │   ├── comment.go         # 评论接口
│   │   ├── public.go          # 公共接口
│   │   ├── routes.go          # 路由注册
│   │   ├── system.go          # 系统接口
│   │   └── export_import.go   # 导入导出
│   ├── services/              # 业务逻辑
│   ├── uploads/               # 上传文件目录
│   ├── utils/                 # 工具函数
│   ├── tests/                 # 后端测试
│   ├── main.go               # 入口文件
│   ├── go.mod                # Go 依赖
│   ├── go.sum
│   └── .env                  # 环境配置
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── admin/            # 管理后台
│   │   ├── components/      # 公共组件
│   │   ├── config/           # API 配置
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── theme/            # MUI 主题
│   │   ├── utils/            # 工具函数
│   │   ├── App.jsx           # 主应用
│   │   ├── main.jsx          # 入口文件
│   │   └── index.css
│   ├── public/               # 静态资源
│   ├── dist/                 # 构建输出
│   ├── package.json
│   ├── vite.config.js
│   ├── vitest.config.js
│   ├── nginx.conf            # Nginx 配置
│   └── Dockerfile
│
├── docs/                      # 文档
│   └── readme/               # README 文档
│
├── logs/                      # 日志目录
├── docker-compose.yml         # Docker 编排
├── README.md                  # 项目说明
├── CLAUDE.md                 # AI 开发指引
└── AGENTS.md                 # Agent 指令
```

## API 接口

### 公共接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/articles | 获取文章列表 |
| GET | /api/articles/:id | 获取文章详情 |
| GET | /api/articles/:id/comments | 获取文章评论 |
| POST | /api/articles/:id/comments | 提交评论 |
| GET | /api/categories | 获取分类列表 |
| GET | /api/tags | 获取标签列表 |
| GET | /api/site-blocks | 获取站点区块 |
| GET | /api/skills | 获取技能列表 |
| GET | /api/contacts | 获取联系方式 |
| GET | /api/avatars | 获取头像列表 |
| GET | /health | 健康检查 |
| GET | /robots.txt |  Robots 协议 |
| GET | /sitemap.xml | 网站地图 |

### 管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/admin/login | 管理员登录 |
| POST | /api/admin/logout | 管理员登出 |
| GET | /api/admin/verify | 验证登录状态 |
| GET | /api/admin/auth/me | 获取当前用户 |
| GET | /api/admin/site-blocks | 获取站点区块 |
| POST | /api/admin/site-blocks | 创建站点区块 |
| PUT | /api/admin/site-blocks | 批量更新站点区块 |
| DELETE | /api/admin/site-blocks/:id | 删除站点区块 |
| GET | /api/admin/skills | 获取技能列表 |
| POST | /api/admin/skills | 创建技能 |
| PUT | /api/admin/skills/:id | 更新技能 |
| DELETE | /api/admin/skills/:id | 删除技能 |
| GET | /api/admin/contacts | 获取联系方式 |
| POST | /api/admin/contacts | 创建联系方式 |
| PUT | /api/admin/contacts/:id | 更新联系方式 |
| DELETE | /api/admin/contacts/:id | 删除联系方式 |
| GET | /api/admin/avatars | 获取头像列表 |
| POST | /api/admin/avatars | 上传头像 |
| PUT | /api/admin/avatars/:id/set_current | 设为当前头像 |
| DELETE | /api/admin/avatars/:id | 删除头像 |
| GET | /api/admin/articles | 获取文章列表（管理） |
| GET | /api/admin/articles/:id | 获取文章详情（管理） |
| POST | /api/admin/articles | 创建文章 |
| PUT | /api/admin/articles/:id | 更新文章 |
| DELETE | /api/admin/articles/:id | 删除文章 |
| POST | /api/admin/articles/batch-delete | 批量删除文章 |
| POST | /api/admin/articles/cover | 上传封面图 |
| POST | /api/admin/articles/pdf/upload | 上传 PDF |
| POST | /api/admin/articles/import-md | 导入 Markdown |
| POST | /api/admin/articles/ai-analyze | AI 分析文章内容 |
| POST | /api/admin/articles/:id/analyze | AI 分析指定文章 |
| GET | /api/admin/comments | 获取评论列表 |
| GET | /api/admin/comments/export | 导出评论 |
| GET | /api/admin/comments/limits | 获取评论限制配置 |
| DELETE | /api/admin/comments/:id | 删除评论 |
| PUT | /api/admin/comments/:id | 更新评论状态 |
| PUT | /api/admin/comments/:id/status | 更新评论状态 |
| GET | /api/admin/ai-settings | 获取 AI 配置 |
| PUT | /api/admin/ai-settings | 更新 AI 配置 |
| POST | /api/admin/ai-settings/test | 测试 AI 配置 |
| GET | /api/admin/export | 导出数据 |
| POST | /api/admin/import | 导入数据 |
| GET | /api/admin/stats | 获取统计信息 |

## 测试

### 后端测试

```bash
cd backend
go test ./...
```

### 前端测试

```bash
cd frontend

# 运行测试
npm run test

# 运行测试（一次性）
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 前端代码检查

```bash
cd frontend
npm run lint
```

## 环境变量

### 数据库配置

| 变量 | 默认值 | 描述 |
|------|--------|------|
| DB_HOST | host.docker.internal | 数据库主机 |
| DB_PORT | 5432 | 数据库端口 |
| DB_USER | postgres | 数据库用户名 |
| DB_PASSWORD | password | 数据库密码 |
| DB_NAME | mywebsite | 数据库名称 |

### 安全配置

| 变量 | 描述 |
|------|------|
| SECRET_KEY | 应用密钥 |
| JWT_SECRET_KEY | JWT 密钥 |

### 管理员账号

| 变量 | 默认值 | 描述 |
|------|--------|------|
| ADMIN_USERNAME | admin | 管理员用户名 |
| ADMIN_PASSWORD | admin123 | 管理员密码 |

### 上传配置

| 变量 | 默认值 | 描述 |
|------|--------|------|
| UPLOAD_FOLDER | uploads | 上传文件夹 |
| MAX_CONTENT_LENGTH | 5242880 | 最大内容长度（5MB） |
| ALLOWED_IMAGE_EXTENSIONS | jpg,jpeg,png,webp | 允许的图片扩展名 |

### OpenAI 配置（可选）

| 变量 | 描述 |
|------|------|
| OPENAI_API_KEY | OpenAI API Key |
| OPENAI_MODEL | OpenAI 模型，默认 gpt-3.5-turbo |

### JWT 配置

| 变量 | 默认值 | 描述 |
|------|--------|------|
| JWT_ACCESS_TOKEN_EXPIRES | 86400 | 访问令牌有效期（秒） |
| JWT_REMEMBER_TOKEN_EXPIRES | 604800 | 记住我令牌有效期（秒） |

### 评论限制配置

| 变量 | 默认值 | 描述 |
|------|--------|------|
| COMMENT_LIMIT_ENABLED | true | 是否启用评论限制 |
| COMMENT_LIMIT_TIME_WINDOW | 24 | 时间窗口（小时） |
| COMMENT_LIMIT_MAX_COUNT | 1 | 时间窗口内最大评论数 |
| COMMENT_LIMIT_EXEMPT_ADMIN | true | 管理员是否免于限制 |

## 许可证

MIT License
