# API配置系统使用说明

## 概述

为了解决前端代码中API地址硬编码的问题，我们创建了一个统一的API配置系统。现在所有的API地址都通过 `src/config/api.js` 文件进行集中管理。

## 配置文件结构

### 1. 环境变量支持

系统支持通过环境变量 `VITE_API_BASE_URL` 来配置API基础地址：

```bash
# 开发环境
VITE_API_BASE_URL=http://localhost:5000

# 生产环境
VITE_API_BASE_URL=https://your-domain.com
```

### 2. 自动环境检测

如果没有设置环境变量，系统会自动根据环境选择默认地址：
- 开发环境：`http://localhost:5000`
- 生产环境：`window.location.origin`

## 使用方法

### 1. 导入配置

在需要使用API的组件中导入：

```javascript
import { getApiUrl } from '../config/api';
```

### 2. 使用API地址

```javascript
// 获取文章列表
const response = await fetch(getApiUrl.articles());

// 获取特定文章
const response = await fetch(getApiUrl.articleDetail(articleId));

// 管理后台登录
const response = await fetch(getApiUrl.adminLogin(), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(loginData)
});

// WebSocket连接
const socket = io(getApiUrl.websocket());
```

## 可用的API方法

### 公共API
- `getApiUrl.siteBlocks()` - 获取站点块数据
- `getApiUrl.skills()` - 获取技能列表
- `getApiUrl.contacts()` - 获取联系方式
- `getApiUrl.avatars()` - 获取头像列表
- `getApiUrl.articles()` - 获取文章列表
- `getApiUrl.articleDetail(id)` - 获取特定文章
- `getApiUrl.avatarFile(filename)` - 获取头像文件

### 管理后台API
- `getApiUrl.adminLogin()` - 管理员登录
- `getApiUrl.adminLogout()` - 管理员登出
- `getApiUrl.adminSiteBlocks()` - 管理站点块
- `getApiUrl.adminSkills()` - 管理技能
- `getApiUrl.adminContacts()` - 管理联系方式
- `getApiUrl.adminAvatars()` - 管理头像
- `getApiUrl.adminAvatarFile(filename)` - 获取管理后台头像文件
- `getApiUrl.adminArticles()` - 管理文章
- `getApiUrl.adminArticleDetail(id)` - 管理特定文章
- `getApiUrl.adminArticleCover()` - 上传文章封面
- `getApiUrl.adminArticleAiAnalyze()` - AI分析文章
- `getApiUrl.adminArticleBatchDelete()` - 批量删除文章
- `getApiUrl.adminArticleImportMd()` - 导入Markdown文件
- `getApiUrl.adminExport()` - 导出数据
- `getApiUrl.adminImport()` - 导入数据

### WebSocket
- `getApiUrl.websocket()` - WebSocket连接地址

## 环境配置

### 1. 创建环境变量文件

复制 `env.example` 文件为 `.env.local`：

```bash
cp env.example .env.local
```

### 2. 修改环境变量

编辑 `.env.local` 文件，设置你的API地址：

```bash
# 开发环境
VITE_API_BASE_URL=http://localhost:5000

# 生产环境
VITE_API_BASE_URL=https://your-production-domain.com
```

### 3. 不同环境的配置

你可以为不同环境创建不同的配置文件：

- `.env.development` - 开发环境
- `.env.production` - 生产环境
- `.env.local` - 本地环境（优先级最高）

## 优势

1. **集中管理**：所有API地址都在一个文件中管理
2. **环境适配**：自动根据环境选择正确的API地址
3. **易于维护**：修改API地址只需要改一个地方
4. **类型安全**：提供统一的API方法，减少拼写错误
5. **扩展性好**：可以轻松添加新的API端点

## 注意事项

1. 确保在修改API配置后重启开发服务器
2. 生产环境部署时需要正确设置环境变量
3. 所有新的API调用都应该使用 `getApiUrl` 方法
4. 避免在代码中直接使用硬编码的API地址

## 迁移指南

如果你有新的组件需要添加API调用，请：

1. 在 `src/config/api.js` 中添加新的API端点
2. 在 `getApiUrl` 对象中添加对应的方法
3. 在组件中导入并使用 `getApiUrl` 方法
4. 删除任何硬编码的API地址 