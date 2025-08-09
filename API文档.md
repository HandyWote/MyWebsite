# HandyWrite API 文档

## 📋 API 概览

HandyWrite 提供 RESTful API 接口，支持个人网站的所有功能，包括文章管理、技能展示、联系方式等。

### 基础信息
- **基础URL**: `https://webbackend.handywote.site`
- **API版本**: v1
- **数据格式**: JSON
- **字符编码**: UTF-8

### 认证方式
- **公共API**: 无需认证
- **管理API**: JWT Token 认证
- **Token格式**: `Bearer <token>`

## 🔐 认证

### 管理员登录
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### 使用 Token
```http
GET /api/admin/articles
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## 📝 文章管理 API

### 获取文章列表
```http
GET /api/articles?page=1&per_page=10&category=技术&tag=React
```

**查询参数**:
- `page` (int): 页码，默认 1
- `per_page` (int): 每页数量，默认 10
- `category` (string): 分类筛选
- `tag` (string): 标签筛选

**响应示例**:
```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": 1,
        "title": "React 开发指南",
        "summary": "React 开发的最佳实践...",
        "content": "# React 开发指南\n\n## 介绍\n...",
        "category": "技术",
        "tags": ["React", "JavaScript", "前端"],
        "cover_image": "/uploads/covers/react-guide.jpg",
        "view_count": 156,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 获取文章详情
```http
GET /api/articles/{id}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "React 开发指南",
    "summary": "React 开发的最佳实践...",
    "content": "# React 开发指南\n\n## 介绍\n...",
    "category": "技术",
    "tags": ["React", "JavaScript", "前端"],
    "cover_image": "/uploads/covers/react-guide.jpg",
    "view_count": 157,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "author": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

### 创建文章 (管理员)
```http
POST /api/admin/articles
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "新文章标题",
  "summary": "文章摘要",
  "content": "# 文章内容\n\nMarkdown 格式的内容...",
  "category": "技术",
  "tags": "React,JavaScript,前端",
  "is_published": true
}
```

### 更新文章 (管理员)
```http
PUT /api/admin/articles/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "更新后的标题",
  "content": "更新后的内容",
  "category": "技术",
  "tags": "React,JavaScript"
}
```

### 删除文章 (管理员)
```http
DELETE /api/admin/articles/{id}
Authorization: Bearer <token>
```

### 批量删除文章 (管理员)
```http
POST /api/admin/articles/batch-delete
Authorization: Bearer <token>
Content-Type: application/json

{
  "ids": [1, 2, 3]
}
```

### 上传文章封面 (管理员)
```http
POST /api/admin/articles/cover
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [图片文件]
```

### AI 分析文章 (管理员)
```http
POST /api/admin/articles/ai-analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "文章内容",
  "title": "文章标题"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "summary": "AI 生成的文章摘要",
    "tags": ["AI", "技术", "分析"],
    "category": "技术",
    "suggestions": [
      "建议添加更多代码示例",
      "可以增加相关链接"
    ]
  }
}
```

## 🏷️ 分类和标签 API

### 获取分类列表
```http
GET /api/categories
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "name": "技术",
      "count": 15
    },
    {
      "name": "生活",
      "count": 8
    },
    {
      "name": "随笔",
      "count": 5
    }
  ]
}
```

### 获取标签列表
```http
GET /api/tags
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "name": "React",
      "count": 12
    },
    {
      "name": "JavaScript",
      "count": 18
    },
    {
      "name": "Python",
      "count": 10
    }
  ]
}
```

## 🛠️ 技能管理 API

### 获取技能列表
```http
GET /api/skills
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "React",
      "category": "前端",
      "level": 90,
      "description": "熟练使用 React 开发",
      "icon": "react-icon.svg"
    },
    {
      "id": 2,
      "name": "Python",
      "category": "后端",
      "level": 85,
      "description": "Python 开发经验丰富",
      "icon": "python-icon.svg"
    }
  ]
}
```

### 创建技能 (管理员)
```http
POST /api/admin/skills
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Vue.js",
  "category": "前端",
  "level": 80,
  "description": "Vue.js 开发技能"
}
```

### 更新技能 (管理员)
```http
PUT /api/admin/skills/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Vue.js 3",
  "level": 85,
  "description": "Vue.js 3 开发技能"
}
```

### 删除技能 (管理员)
```http
DELETE /api/admin/skills/{id}
Authorization: Bearer <token>
```

## 👤 头像管理 API

### 获取头像列表
```http
GET /api/avatars
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "默认头像",
      "filename": "default-avatar.jpg",
      "url": "/api/admin/avatars/file/default-avatar.jpg",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 上传头像 (管理员)
```http
POST /api/admin/avatars
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [图片文件]
name: 头像名称
```

### 设置活跃头像 (管理员)
```http
PUT /api/admin/avatars/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_active": true
}
```

### 获取头像文件
```http
GET /api/admin/avatars/file/{filename}
```

## 📞 联系方式 API

### 获取联系方式
```http
GET /api/contacts
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "email",
      "label": "邮箱",
      "value": "contact@example.com",
      "icon": "email-icon.svg",
      "url": "mailto:contact@example.com"
    },
    {
      "id": 2,
      "type": "github",
      "label": "GitHub",
      "value": "github.com/username",
      "icon": "github-icon.svg",
      "url": "https://github.com/username"
    }
  ]
}
```

### 创建联系方式 (管理员)
```http
POST /api/admin/contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "linkedin",
  "label": "LinkedIn",
  "value": "linkedin.com/in/username",
  "url": "https://linkedin.com/in/username"
}
```

### 更新联系方式 (管理员)
```http
PUT /api/admin/contacts/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "LinkedIn 主页",
  "value": "linkedin.com/in/newusername"
}
```

### 删除联系方式 (管理员)
```http
DELETE /api/admin/contacts/{id}
Authorization: Bearer <token>
```

## 🏠 网站内容 API

### 获取网站内容块
```http
GET /api/site-blocks
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "about": {
      "title": "关于我",
      "content": "我是一名全栈开发者...",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    "home": {
      "title": "首页介绍",
      "content": "欢迎来到我的个人网站...",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 更新网站内容 (管理员)
```http
PUT /api/admin/site-blocks
Authorization: Bearer <token>
Content-Type: application/json

{
  "about": {
    "title": "关于我",
    "content": "更新后的个人介绍..."
  },
  "home": {
    "title": "首页介绍",
    "content": "更新后的首页内容..."
  }
}
```

## 📊 数据导入导出 API

### 导出数据 (管理员)
```http
GET /api/admin/export
Authorization: Bearer <token>
```

**响应**: 返回 JSON 格式的完整数据备份

### 导入数据 (管理员)
```http
POST /api/admin/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "articles": [...],
  "skills": [...],
  "contacts": [...],
  "site_blocks": {...}
}
```

## 🔌 WebSocket API

### 连接 WebSocket
```javascript
import io from 'socket.io-client';

const socket = io('https://webbackend.handywote.site', {
  path: '/socket.io/'
});

// 连接事件
socket.on('connect', () => {
  console.log('WebSocket 连接成功');
});

// 接收消息
socket.on('message', (data) => {
  console.log('收到消息:', data);
});

// 断开连接
socket.on('disconnect', () => {
  console.log('WebSocket 连接断开');
});
```

### 实时更新事件
- `skills_updated`: 技能列表更新
- `contacts_updated`: 联系方式更新
- `articles_updated`: 文章列表更新
- `avatars_updated`: 头像更新

## 📝 错误处理

### 错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "title": ["标题不能为空"],
      "content": ["内容不能为空"]
    }
  }
}
```

### 常见错误码
- `400`: 请求参数错误
- `401`: 未授权访问
- `403`: 权限不足
- `404`: 资源不存在
- `422`: 数据验证失败
- `500`: 服务器内部错误

### 错误处理示例
```javascript
const handleApiError = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 401:
        // 重新登录
        window.location.href = '/admin/login';
        break;
      case 403:
        alert('权限不足');
        break;
      case 422:
        // 显示验证错误
        console.log(error.error.details);
        break;
      default:
        alert(error.error.message || '请求失败');
    }
    
    throw new Error(error.error.message);
  }
  
  return response.json();
};
```

## 🔒 安全说明

### 请求限制
- **频率限制**: 每分钟最多 100 次请求
- **文件上传**: 最大 5MB，支持 jpg, jpeg, png, webp
- **Token 有效期**: 24 小时

### 安全建议
1. 使用 HTTPS 进行所有 API 调用
2. 妥善保管 JWT Token
3. 定期更换管理员密码
4. 监控异常访问日志

## 📞 技术支持

如有 API 相关问题，请：
1. 查看错误日志
2. 检查请求格式
3. 验证认证信息
4. 联系技术支持

---

**注意**: 所有 API 调用都应该包含适当的错误处理。 