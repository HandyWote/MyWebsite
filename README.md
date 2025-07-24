# HandyWote - 个人介绍网站

一个现代化的个人介绍网站，包含个人介绍、技能展示、项目展示和文章系统。

## 功能特性

### 主要功能
- 🏠 **首页展示** - 个人简介和联系方式
- 👤 **关于我** - 详细的个人介绍
- 🛠️ **技能展示** - 技术技能和专长
- 📁 **项目展示** - 个人项目作品集
- 📝 **文章系统** - 个人博客文章管理
- 📞 **联系方式** - 多种联系方式展示

### 文章系统特性
- 📚 **文章管理** - 支持 Markdown 格式的文章内容
- 🔍 **搜索功能** - 按标题、内容、标签搜索文章
- 🏷️ **分类标签** - 文章分类和标签系统
- 💬 **评论系统** - 匿名评论功能
- 📊 **阅读统计** - 文章阅读量统计
- 📤 **分享功能** - 社交媒体分享
- 🖼️ **图片上传** - 支持文章封面图片
- 📱 **响应式设计** - 完美适配移动端

## 技术栈

### 前端
- **React 19** - 现代化的前端框架
- **Vite 6** - 快速的构建工具
- **Material-UI 6** - 美观的 UI 组件库
- **Framer Motion 12** - 流畅的动画效果
- **React Router 6** - 单页应用路由
- **React Markdown 8** - Markdown 渲染

### 后端
- **Python Flask 2.3.3** - 轻量级 Web 框架
- **PostgreSQL** - 关系型数据库
- **SQLAlchemy 3.0.5** - ORM 数据库操作
- **Flask-CORS 4.0.0** - 跨域资源共享
- **Flask-JWT-Extended 4.5.3** - JWT 认证
- **Flask-APScheduler 1.13.0** - 定时任务
- **Flask-SocketIO 5.3.6** - WebSocket 支持

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd handywote
```

### 2. 前端设置

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 3. 后端设置

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 4. 数据库设置

#### 安装 PostgreSQL

**Windows:**
1. 下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)
2. 记住设置的密码

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 创建数据库

```bash
# 登录 PostgreSQL
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE mywebsite;
CREATE USER n8n WITH PASSWORD '1234';
GRANT ALL PRIVILEGES ON DATABASE mywebsite TO n8n;
\q
```

#### 配置数据库连接

在项目根目录创建 `.env` 文件，配置数据库连接信息：

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

### 5. 初始化数据库

```bash
cd backend
python setup.py
```

按照提示选择是否启动服务。

### 6. 启动服务

```bash
# 启动后端服务
cd backend
python setup.py

# 启动前端服务（新终端）
npm run dev
```

现在可以访问 `http://localhost:5173` 查看网站。

## Docker 部署

项目支持 Docker 部署，详情请查看 [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) 文件。

## 项目结构

```
handywote/
├── src/                  # 前端源代码
│   ├── components/       # 前端公共组件
│   ├── admin/            # 管理后台组件
│   ├── App.jsx           # 主应用组件
│   └── main.jsx          # 应用入口
├── backend/              # 后端代码
│   ├── models/           # 数据模型
│   ├── routes/           # API 路由
│   ├── services/         # 业务逻辑
│   ├── utils/            # 工具函数
│   ├── app.py            # Flask 应用
│   ├── setup.py          # 初始化和启动脚本
│   ├── extensions.py     # 扩展组件
│   ├── requirements.txt  # Python 依赖
│   └── uploads/          # 上传文件目录
├── public/               # 静态资源
├── package.json          # 前端依赖配置
└── README.md             # 项目说明
```

## 文章系统使用

### 添加文章

1. **通过管理后台添加**：
   访问 `http://localhost:5173/admin`，使用管理员账号登录后添加文章。

2. **通过 API 添加**：
```bash
curl -X POST http://localhost:5000/api/admin/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "文章标题",
    "summary": "文章摘要",
    "content": "# Markdown 内容\n\n文章正文...",
    "category": "技术",
    "tags": "标签1,标签2"
  }'
```

### 上传图片

```bash
curl -X POST http://localhost:5000/api/admin/articles/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

## 部署

### 生产环境部署

1. **构建前端**：
```bash
npm run build
```

2. **配置后端**：
```bash
# 设置环境变量
export FLASK_ENV=production
```

3. **使用 Gunicorn 部署**：
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 --worker-class gevent --worker-connections 1000 app:app
```

4. **配置 Nginx**：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/handywote/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /uploads {
        alias /path/to/handywote/backend/uploads;
    }
}
```

## 自定义配置

### 修改个人信息

通过管理后台修改个人信息：
1. 访问 `http://localhost:5173/admin`
2. 使用管理员账号登录
3. 在相应模块修改个人信息

### 修改样式

项目使用 Material-UI 主题系统，可以在 `src/App.jsx` 中配置主题：

```jsx
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196F3',
    },
    secondary: {
      main: '#21CBF3',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* 应用内容 */}
    </ThemeProvider>
  );
}
```

## 常见问题

### 数据库连接问题
如果遇到数据库连接问题，请检查：
1. PostgreSQL 服务是否正在运行
2. `.env` 文件中的数据库配置是否正确
3. 数据库用户和密码是否正确
4. 防火墙是否阻止了数据库连接

### Docker 部署问题
如果使用 Docker 部署遇到问题，请检查：
1. `.env` 文件是否正确配置
2. 数据库是否在宿主机上运行并接受连接
3. 端口是否被正确映射

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题，请通过以下方式联系：

- 邮箱：your-email@example.com
- GitHub：[your-github](https://github.com/your-username)
