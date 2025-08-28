# HandyWote 个人网站项目

## 📖 项目简介

HandyWote 是一个现代化的个人网站项目，采用前后端分离架构，包含个人展示、文章管理、技能展示等功能。项目支持响应式设计，提供完整的管理后台。

## 🏗️ 技术架构

### 前端技术栈
- **框架**: React 18 + Vite
- **路由**: React Router v6
- **样式**: CSS3 + 响应式设计
- **构建工具**: Vite
- **包管理**: npm

### 后端技术栈
- **框架**: Flask (Python)
- **数据库**: MySQL
- **ORM**: SQLAlchemy
- **认证**: JWT (JSON Web Token)
- **实时通信**: Socket.IO
- **AI集成**: OpenAI API
- **文件上传**: 本地存储

### 部署技术
- **容器化**: Docker + Docker Compose
- **Web服务器**: Nginx
- **SSL证书**: Let's Encrypt
- **进程管理**: PM2 / systemd

## 📁 项目结构

```
MyWebsite/
├── frontend/                 # 前端代码
│   ├── src/
│   │   ├── components/      # 公共组件
│   │   ├── admin/          # 管理后台
│   │   ├── config/         # 配置文件
│   │   └── main.jsx        # 入口文件
│   ├── public/             # 静态资源
│   ├── dist/               # 构建输出
│   └── package.json        # 前端依赖
├── backend/                # 后端代码
│   ├── routes/            # API路由
│   ├── models/            # 数据模型
│   ├── services/          # 业务逻辑
│   ├── utils/             # 工具函数
│   └── app.py             # 应用入口
├── docker-compose.yml     # Docker编排
├── nginx.conf             # Nginx配置
└── README.md              # 项目文档
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Python 3.8+
- MySQL 8.0+
- Docker (可选)

### 本地开发

1. **克隆项目**
```bash
git clone <repository-url>
cd MyWebsite
```

2. **前端开发**
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

3. **后端开发**
```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动后端服务
python app.py
```

4. **环境变量配置**
```bash
# 前端环境变量 (.env.local)
VITE_API_BASE_URL=http://localhost:5000/

# 后端环境变量 (backend/.env)
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=handywrite
SECRET_KEY=your_secret_key
OPENAI_API_KEY=your_openai_key
```

### Docker 部署

1. **构建镜像**
```bash
docker-compose build
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **查看日志**
```bash
docker-compose logs -f
```

## 🌐 生产环境部署

### 域名配置
- **前端域名**: `https://www.handywote.site`
- **后端域名**: `https://webbackend.handywote.site`

### 部署步骤

1. **服务器准备**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install nginx certbot python3-certbot-nginx -y
```

2. **SSL证书配置**
```bash
# 为前端域名申请证书
sudo certbot --nginx -d www.handywote.site

# 为后端域名申请证书
sudo certbot --nginx -d webbackend.handywote.site
```

3. **前端部署**
```bash
# 构建生产版本
npm run build

# 上传到服务器
scp -r dist/* user@server:/var/www/handywote.site/
```

4. **后端部署**
```bash
# 上传后端代码
scp -r backend/* user@server:/opt/handywrite/backend/

# 安装依赖
pip install -r requirements.txt

# 启动服务
pm2 start app.py --name handywrite-backend
```

## 🔧 配置说明

### API 配置
项目使用集中化的 API 配置管理，详见 `src/config/api.js`：

```javascript
// 环境变量配置
VITE_API_BASE_URL=https://webbackend.handywote.site/

// 使用示例
import { getApiUrl } from '@/config/api';

// 获取文章列表
const articles = await fetch(getApiUrl.articles());

// 获取文章详情
const article = await fetch(getApiUrl.articleDetail(123));
```

### CORS 配置
后端已配置 CORS 支持跨域访问：

```python
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "https://www.handywote.site",
            "https://handywote.site"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

## 📚 功能模块

### 公共功能
- **首页展示**: 个人介绍、技能展示
- **文章系统**: 文章列表、详情、分类、标签
- **联系方式**: 社交媒体链接
- **响应式设计**: 支持移动端访问

### 管理后台
- **内容管理**: 网站内容块编辑
- **文章管理**: 文章的增删改查
- **技能管理**: 技能标签管理
- **头像管理**: 头像上传和管理
- **数据导入导出**: 支持数据备份恢复
- **AI 辅助**: OpenAI 集成，智能分析

## 🔒 安全特性

- **JWT 认证**: 管理后台访问控制
- **CORS 配置**: 跨域安全控制
- **输入验证**: 前后端双重验证
- **SQL 注入防护**: ORM 自动防护
- **XSS 防护**: 输出转义处理

## 🐛 常见问题

### 1. CORS 错误
**问题**: 前端无法访问后端 API
**解决**: 检查后端 CORS 配置，确保包含前端域名

### 2. 环境变量不生效
**问题**: 修改环境变量后前端仍使用旧配置
**解决**: 重新构建前端 `npm run build`

### 3. WebSocket 连接失败
**问题**: 实时通信功能异常
**解决**: 检查 WebSocket URL 配置和 SSL 证书

### 4. 数据库连接失败
**问题**: 后端无法连接数据库
**解决**: 检查数据库配置和网络连接

## 📝 开发指南

### 添加新 API 端点

1. **后端路由** (`backend/routes/`)
```python
@bp.route('/api/new-endpoint', methods=['GET'])
def new_endpoint():
    return jsonify({'message': 'success'})
```

2. **前端配置** (`src/config/api.js`)
```javascript
// 添加端点定义
NEW_ENDPOINT: '/api/new-endpoint',

// 添加便捷方法
newEndpoint: () => buildApiUrl(API_ENDPOINTS.PUBLIC.NEW_ENDPOINT),
```

3. **前端使用**
```javascript
import { getApiUrl } from '@/config/api';

const response = await fetch(getApiUrl.newEndpoint());
```

### 添加新组件

1. **创建组件文件** (`src/components/`)
2. **添加路由配置** (`src/App.jsx`)
3. **更新导航菜单** (如需要)

## 📄 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📞 联系方式

- **项目地址**: [GitHub Repository]
- **在线演示**: [https://www.handywote.site]
- **问题反馈**: [GitHub Issues]

---

**注意**: 本项目仅供学习和个人使用，请遵守相关法律法规。
