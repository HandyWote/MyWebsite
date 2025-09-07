# 项目概述

这是一个基于 React 和 Vite 构建的现代化个人网站项目，包含前端和后端两部分。前端名为 "HandyWote"，采用 Material-UI (MUI) 作为 UI 组件库，并集成了多种现代 Web 技术。后端基于 Flask 构建，提供 RESTful API 和 WebSocket 支持。

## 核心功能

1.  **个人主页**: 展示个人介绍、技能、联系方式和 GitHub 贡献日历。
2.  **项目展示**: 展示个人项目。
3.  **文章系统**: 支持文章列表、详情、分类、标签筛选和分页功能。
4.  **后台管理**: 提供完整的后台管理系统，用于管理网站内容、技能、联系方式、头像、文章等。
5.  **响应式设计**: 适配不同屏幕尺寸，提供良好的移动端体验。
6.  **实时通信**: 通过 WebSocket 实现实时数据更新。
7.  **AI 集成**: 后台支持 AI 分析文章内容，提供分类和标签建议。
8.  **文件上传**: 支持文章封面图片上传，并自动转换为 WebP 格式以优化性能。

# 技术栈

## 前端

*   **核心框架**: React 19, Vite 6
*   **状态管理**: React Hooks
*   **路由**: React Router v6
*   **UI 库**: Material-UI (MUI) 6
*   **样式**: Emotion
*   **动画**: Framer Motion 12
*   **HTTP 客户端**: Axios
*   **代码规范**: ESLint 9
*   **构建工具**: Vite
*   **拖拽**: @dnd-kit
*   **Markdown 渲染**: marked, react-markdown, remark-gfm, rehype-katex, remark-math
*   **图表**: mermaid
*   **数学公式**: katex
*   **语法高亮**: react-syntax-highlighter
*   **WebSocket**: socket.io-client
*   **安全**: xss

## 后端

*   **核心框架**: Flask 3
*   **数据库**: PostgreSQL (通过 SQLAlchemy ORM)
*   **认证**: JWT (Flask-JWT-Extended)
*   **WebSocket**: Flask-SocketIO
*   **任务调度**: Flask-APScheduler
*   **跨域支持**: Flask-CORS
*   **AI 集成**: OpenAI API
*   **图片处理**: Pillow
*   **部署**: Docker, Gunicorn

# 项目结构

```
.
├── backend/                # 后端代码目录
│   ├── app.py              # Flask 应用入口
│   ├── extensions.py        # Flask 扩展初始化
│   ├── pyproject.toml       # Python 依赖管理
│   ├── models/             # 数据模型
│   ├── routes/             # API 路由
│   ├── services/           # 业务逻辑服务
│   ├── utils/              # 工具函数
│   └── uploads/            # 上传文件目录
└── frontend/               # 前端代码目录
    ├── public/             # 静态资源目录
    ├── src/                # 源代码目录
    │   ├── components/     # 公共组件
    │   ├── admin/          # 后台管理相关代码
    │   ├── config/         # 配置文件
    │   ├── hooks/          # 自定义 React Hooks
    │   ├── theme/          # 主题配置
    │   ├── utils/          # 工具函数
    │   ├── App.jsx         # 根组件
    │   ├── main.jsx        # 入口文件
    │   └── index.css       # 全局样式
    ├── package.json        # 项目依赖和脚本
    ├── vite.config.js      # Vite 配置文件
    ├── eslint.config.js    # ESLint 配置文件
    └── index.html          # HTML 模板文件
```

# 开发与构建

## 环境要求

### 前端
*   Node.js (推荐使用最新 LTS 版本)
*   npm 或 yarn

### 后端
*   Python >= 3.11
*   PostgreSQL 数据库

## 前端开发

### 安装依赖

```bash
cd frontend
npm install
```

### 启动开发服务器

```bash
cd frontend
npm run dev
```

默认情况下，开发服务器将在 `http://localhost:3131` 启动。

### 构建生产版本

```bash
cd frontend
npm run build
```

构建后的文件将输出到 `dist` 目录。

### 代码检查

```bash
cd frontend
npm run lint
```

### 预览生产构建

```bash
cd frontend
npm run preview
```

## 后端开发

### 安装依赖

```bash
cd backend
# 推荐使用虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate  # Windows
pip install -e .
```

### 初始化环境

首次运行需要初始化环境（创建 .env 文件和数据库）：

```bash
cd backend
python app.py --init
```

### 启动开发服务器

```bash
cd backend
python app.py --debug
```

默认情况下，开发服务器将在 `http://localhost:5000` 启动。

# API 配置

## 前端 API 配置

项目通过 `src/config/api.js` 文件集中管理所有 API 地址。API 基础 URL 可以通过环境变量 `VITE_API_BASE_URL` 进行动态配置。

*   开发环境默认 API 地址: `http://localhost:5000`
*   生产环境默认 API 地址: 当前域名

## 后端 API 端点

后端提供以下主要 API 端点：

*   `/api/site-blocks` - 网站内容块
*   `/api/skills` - 技能列表
*   `/api/contacts` - 联系方式
*   `/api/avatars` - 头像列表
*   `/api/articles` - 文章列表和管理
*   `/api/admin/*` - 管理员专用 API（需要 JWT 认证）
*   `/socket.io/*` - WebSocket 连接点

# 后台管理

后台管理系统的入口为 `/admin`。用户需要通过 `/admin/login` 页面进行登录认证。登录成功后，可以管理以下内容：

*   网站内容块 (首页介绍、关于我等)
*   技能
*   联系方式
*   头像
*   文章 (增删改查、批量删除、Markdown 导入、AI 分析)
*   评论
*   数据导入导出

# 开发约定

## 前端

*   **组件化开发**: 所有 UI 元素都应尽可能地封装成可复用的组件。
*   **懒加载**: 对于路由和组件，优先使用 React 的懒加载机制以优化性能。
*   **响应式设计**: 所有组件都应考虑在不同屏幕尺寸下的表现。
*   **代码规范**: 遵循 ESLint 配置，保持代码风格一致。
*   **API 调用**: 所有 API 调用应通过 `src/config/api.js` 中定义的方法进行。
*   **环境变量**: 敏感信息和环境相关配置应通过环境变量进行管理。

## 后端

*   **模块化设计**: 按功能划分模块，保持代码结构清晰。
*   **数据库模型**: 使用 SQLAlchemy ORM 进行数据库操作。
*   **API 设计**: 遵循 RESTful API 设计原则。
*   **错误处理**: 统一错误处理机制，返回标准格式的错误信息。
*   **日志记录**: 重要操作和错误应记录日志。
*   **环境变量**: 敏感信息和环境相关配置应通过环境变量进行管理。