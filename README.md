# HandyWote的个人网站

这是一个使用React + Vite构建的个人网站项目，展示了个人信息、技能和项目经历。

## 环境要求

- Node.js 16.0.0 或更高版本
- npm 7.0.0 或更高版本

## 本地开发

1. 克隆项目到本地：

```bash
git clone https://github.com/HandyWote/personal-website.git
cd personal-website
```

2. 安装依赖：

```bash
npm install
```

3. 启动开发服务器：

```bash
npm run dev
```

启动后，打开浏览器访问 http://localhost:5173 即可查看网站。

## 部署说明

### 构建项目

1. 执行构建命令：

```bash
npm run build
```

构建完成后，所有静态文件将生成在 `dist` 目录中。

### 部署到服务器

你可以选择以下任意方式部署：

1. 静态托管服务（推荐）：
   - GitHub Pages
   - Netlify
   - Vercel

2. 传统服务器：
   - 将 `dist` 目录中的所有文件上传到服务器的网站根目录
   - 配置服务器（Apache/Nginx）将所有请求重定向到 index.html

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 技术栈

- React 18
- Vite
- Material-UI
- Framer Motion
- React Scroll

## 开发建议

如果你计划进行二次开发，建议：

1. 使用TypeScript重构项目以获得更好的类型支持
2. 添加单元测试
3. 使用ESLint和Prettier规范代码风格
