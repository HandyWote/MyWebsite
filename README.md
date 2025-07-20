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
- **Vite** - 快速的构建工具
- **Material-UI** - 美观的 UI 组件库
- **Framer Motion** - 流畅的动画效果
- **React Router** - 单页应用路由
- **React Markdown** - Markdown 渲染

### 后端
- **Python Flask** - 轻量级 Web 框架
- **PostgreSQL** - 关系型数据库
- **SQLAlchemy** - ORM 数据库操作
- **Flask-CORS** - 跨域资源共享

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
CREATE DATABASE handywote_articles;
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE handywote_articles TO your_username;
\q
```

#### 配置数据库连接

编辑 `backend/app.py` 文件，修改数据库连接字符串：

```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://your_username:your_password@localhost/handywote_articles'
```

#### 初始化数据库

```bash
cd backend
python init_db.py
```

### 5. 启动服务

```bash
# 启动后端服务
cd backend
python app.py

# 启动前端服务（新终端）
npm run dev
```

现在可以访问 `http://localhost:5173` 查看网站。

## 项目结构

```
handywote/
├── src/
│   ├── components/
│   │   ├── Home.jsx          # 首页组件
│   │   ├── About.jsx         # 关于我组件
│   │   ├── Skills.jsx        # 技能组件
│   │   ├── Projects.jsx      # 项目组件
│   │   ├── Articles.jsx      # 文章列表组件
│   │   ├── ArticleDetail.jsx # 文章详情组件
│   │   ├── Contact.jsx       # 联系组件
│   │   └── Navbar.jsx        # 导航栏组件
│   ├── App.jsx               # 主应用组件
│   └── main.jsx              # 应用入口
├── backend/
│   ├── app.py                # Flask 应用
│   ├── init_db.py            # 数据库初始化脚本
│   ├── requirements.txt      # Python 依赖
│   └── uploads/              # 上传文件目录
├── public/                   # 静态资源
├── package.json              # 前端依赖配置
└── README.md                 # 项目说明
```

## 文章系统使用

### 添加文章

1. **通过 API 添加**：
```bash
curl -X POST http://localhost:5000/api/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "文章标题",
    "summary": "文章摘要",
    "content": "# Markdown 内容\n\n文章正文...",
    "category": "技术",
    "tags": ["标签1", "标签2"]
  }'
```

2. **通过数据库直接添加**：
```python
from app import app, db, Article

with app.app_context():
    article = Article(
        title="文章标题",
        summary="文章摘要",
        content="# Markdown 内容",
        category="技术",
        tags=["标签1", "标签2"]
    )
    db.session.add(article)
    db.session.commit()
```

### 上传图片

```bash
curl -X POST http://localhost:5000/api/upload \
  -F "file=@/path/to/image.jpg"
```

### 文章功能

- **搜索**：在文章列表页面使用搜索框
- **分类筛选**：使用分类下拉菜单
- **标签筛选**：点击标签进行筛选
- **评论**：在文章详情页面底部发表评论
- **分享**：点击分享按钮分享文章

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
export DATABASE_URL=postgresql://username:password@localhost/handywote_articles
```

3. **使用 Gunicorn 部署**：
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
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
    }

    location /uploads {
        proxy_pass http://localhost:5000;
    }
}
```

## 自定义配置

### 修改个人信息

编辑各个组件文件来修改个人信息：

- `src/components/Home.jsx` - 首页信息
- `src/components/About.jsx` - 关于我信息
- `src/components/Skills.jsx` - 技能信息
- `src/components/Projects.jsx` - 项目信息
- `src/components/Contact.jsx` - 联系信息

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

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题，请通过以下方式联系：

- 邮箱：your-email@example.com
- GitHub：[your-github](https://github.com/your-username)
