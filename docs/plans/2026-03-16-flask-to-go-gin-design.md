# Flask to Go Gin 后端重构设计方案

**日期**: 2026-03-16
**目标**: 将 Flask 后端重构为 Go Gin 框架

---

## 1. 重构目标

- **性能优先**: 利用 Go 的高性能和并发处理能力
- **功能完整**: 保留全部现有功能
- **移除 WebSocket**: 不再需要实时推送
- **数据库**: 继续使用 PostgreSQL + GORM
- **部署**: Docker 容器化

---

## 2. 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Gin |
| ORM | GORM |
| 数据库 | PostgreSQL |
| 认证 | JWT (golang-jwt) |
| 配置 | viper |
| 测试 | testing |

---

## 3. API 路由对照表

### 公开接口

| Flask | Go Gin | 功能 |
|-------|--------|------|
| GET /api/articles | GET /api/articles | 文章列表 |
| GET /api/articles/:id | GET /api/articles/:id | 文章详情 |
| GET /api/articles/:id/comments | GET /api/articles/:id/comments | 评论列表 |
| POST /api/articles/:id/comments | POST /api/articles/:id/comments | 创建评论 |
| GET /api/categories | GET /api/categories | 分类列表 |
| GET /api/tags | GET /api/tags | 标签列表 |
| GET /api/site-blocks | GET /api/site-blocks | 内容块 |
| GET /api/skills | GET /api/skills | 技能列表 |
| GET /api/contacts | GET /api/contacts | 联系方式 |
| GET /api/avatars | GET /api/avatars | 头像列表 |
| GET /api/articles/pdf/:filename | GET /api/articles/pdf/:filename | PDF 文件 |

### 管理后台接口

| Flask | Go Gin | 功能 |
|-------|--------|------|
| POST /api/admin/login | POST /api/admin/login | 登录 |
| POST /api/admin/logout | POST /api/admin/logout | 登出 |
| GET /api/admin/verify | GET /api/admin/verify | 验证 Token |
| GET/POST/PUT/DELETE /api/admin/site-blocks | /api/admin/site-blocks | 管理内容块 |
| GET/POST/PUT/DELETE /api/admin/skills | /api/admin/skills | 管理技能 |
| GET/POST/PUT/DELETE /api/admin/contacts | /api/admin/contacts | 管理联系方式 |
| GET/POST/PUT/DELETE /api/admin/avatars | /api/admin/avatars | 管理头像 |
| POST /api/admin/avatars/file/* | POST /api/admin/avatars/file/* | 头像文件上传 |
| GET/POST/PUT/DELETE /api/admin/articles | /api/admin/articles | 管理文章 |
| POST /api/admin/articles/cover | POST /api/admin/articles/cover | 封面上传 |
| POST /api/admin/articles/pdf/upload | POST /api/admin/articles/pdf/upload | PDF 上传 |
| POST /api/admin/articles/pdf/delete | POST /api/admin/articles/pdf/delete | PDF 删除 |
| POST /api/admin/articles/ai-analyze | POST /api/admin/articles/ai-analyze | AI 分析 |
| POST /api/admin/articles/batch-delete | POST /api/admin/articles/batch-delete | 批量删除 |
| POST /api/admin/articles/import-md | POST /api/admin/articles/import-md | 导入 Markdown |
| GET/DELETE /api/admin/comments/:id | /api/admin/comments/:id | 管理评论 |
| GET /api/admin/comments/limits | GET /api/admin/comments/limits | 评论限制配置 |
| GET/PUT /api/admin/ai-settings | /api/admin/ai-settings | AI 设置 |
| POST /api/admin/ai-settings/test | POST /api/admin/ai-settings/test | AI 测试 |
| GET /api/admin/export | GET /api/admin/export | 导出数据 |
| POST /api/admin/import | POST /api/admin/import | 导入数据 |

### 系统接口

| Flask | Go Gin | 功能 |
|-------|--------|------|
| GET /health | GET /health | 健康检查 |
| GET /robots.txt | GET /robots.txt | SEO |
| GET /sitemap.xml | GET /sitemap.xml | SEO |

---

## 4. 数据模型

### Article (文章)

```go
type Article struct {
    ID          uint           `gorm:"primaryKey" json:"id"`
    Title       string         `gorm:"size:128;not null" json:"title"`
    Category    string         `gorm:"size:64" json:"category"`
    Tags        string         `gorm:"size:256" json:"tags"`
    Cover       string         `gorm:"size:256" json:"cover"`
    Summary     string         `gorm:"type:text" json:"summary"`
    Content     string         `gorm:"type:text" json:"content"`
    ContentType string         `gorm:"size:16;default:markdown" json:"content_type"`
    PDFFilename string         `gorm:"size:256" json:"pdf_filename"` // 显式映射到 pdf_filename 列
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}
```

func (Article) TableName() string {
    return "article"
}

### Comment (评论)

```go
type Comment struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    ArticleID uint      `gorm:"index;not null" json:"article_id"`
    Author    string    `gorm:"size:100;not null" json:"author"`
    Email     string    `gorm:"size:255" json:"email"`
    Content   string    `gorm:"type:text;not null" json:"content"`
    IPAddress string    `gorm:"size:45" json:"ip_address"`    // 记录IP地址
    UserAgent string    `gorm:"type:text" json:"user_agent"`   // 记录用户代理
    Status    string    `gorm:"size:20;default:normal" json:"status"` // normal, pending, spam
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

func (Comment) TableName() string {
    return "comments"
}
```

### Skill (技能)

```go
type Skill struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    Name        string    `gorm:"size:100;not null" json:"name"`
    Description string    `gorm:"type:text" json:"description"`
    Level       int       `gorm:"default:0" json:"level"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

### Contact (联系方式)

```go
type Contact struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Type      string    `gorm:"size:32;not null" json:"type"` // email, wechat, github, etc.
    Value     string    `gorm:"size:255;not null" json:"value"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
```

### Avatar (头像)

```go
type Avatar struct {
    ID          uint           `gorm:"primaryKey" json:"id"`
    Filename    string         `gorm:"size:256;not null" json:"filename"`
    IsCurrent   bool           `gorm:"default:false" json:"is_current"`
    CroppedInfo string         `gorm:"type:jsonb" json:"cropped_info"`
    UploadedAt  time.Time      `json:"uploaded_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

func (Avatar) TableName() string {
    return "avatar"
}
```

### SiteBlock (内容块)

```go
type SiteBlock struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Name      string    `gorm:"size:64;uniqueIndex;not null" json:"name"`
    Content   string    `gorm:"type:jsonb" json:"content"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
```

### AISetting (AI 设置)

```go
type AISetting struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Prompt    string    `gorm:"type:text" json:"prompt"`
    Model     string    `gorm:"size:128" json:"model"`
    BaseURL   string    `gorm:"size:255" json:"base_url"`
    APIKey    string    `gorm:"size:255" json:"api_key"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

func (AISetting) TableName() string {
    return "ai_settings"
}
```

---

## 5. 开发模式

采用 **TDD (Test-Driven Development)** 方式：

1. 先编写测试用例
2. 运行测试（预期失败）
3. 实现功能代码
4. 重复测试直到通过

### 测试覆盖目标

- [ ] 路由测试
- [ ] 中间件测试 (JWT, CORS)
- [ ] 业务逻辑测试
- [ ] 文件上传测试
- [ ] 数据库操作测试

---

## 6. 环境配置

使用 `.env` 文件：

```env
# 数据库
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=mywebsite

# 安全
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production

# 管理员
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 上传
UPLOAD_FOLDER=/app/uploads
MAX_CONTENT_LENGTH=52428800
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,webp

# OpenAI
OPENAI_API_KEY=sk-xxxx
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_URL=https://api.openai.com/v1

# 评论限制
COMMENT_LIMIT_ENABLED=true
COMMENT_LIMIT_TIME_WINDOW=24
COMMENT_LIMIT_MAX_COUNT=1
COMMENT_LIMIT_EXEMPT_ADMIN=true
```

---

## 7. 实施步骤

详见实施计划文档。
