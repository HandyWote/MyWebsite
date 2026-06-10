# 环境变量两层管理机制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立开发环境各端自治 + 生产部署根目录统一管控的两层环境变量管理机制。

**Architecture:** 开发时后端读 `backend/.env`（godotenv）、前端读 `frontend/.env`（Vite），各端独立。生产部署时根目录 `.env` 存放全部变量，Docker Compose 原生读取并通过 `${VAR}` 语法注入到各服务容器中，无需额外分发脚本。前端 Vite 变量通过 Docker build args 在构建阶段注入。

**Tech Stack:** Go (godotenv), Vite (import.meta.env), Docker Compose (env interpolation)

---

## File Structure

### Files to Create
| File | Responsibility |
|---|---|
| `frontend/.env.example` | 前端开发环境变量模板 |
| `.env.example` | 根目录生产部署变量模板（所有服务） |

### Files to Modify
| File | Change |
|---|---|
| `backend/config/config.go` | Config 结构体增加 Port 字段 |
| `backend/config/config_test.go` | 增加 Port 字段的测试 |
| `backend/main.go` | 使用 cfg.Port 替代 os.Getenv("PORT") |
| `backend/.env.example` | 补充 PORT、OPENAI_API_URL；修正 MAX_CONTENT_LENGTH |
| `docker-compose.yml` | env_file 替换为 environment 块 + ${VAR} 插值；dockerfile 路径改为根目录 |
| `Dockerfile.web` | 从 deploy/ 移来；frontend-builder 阶段增加 ARG/ENV 传递 VITE_API_BASE_URL |
| `nginx.web.conf` | 从 deploy/ 移来 |
| `.gitignore` | 添加 `!frontend/.env` 例外；移除 `!.env.local` 例外 |
| `backend/README.md` | 更新环境变量文档 |

### Files to Move
| From | To | Reason |
|---|---|---|
| `deploy/Dockerfile.web` | `Dockerfile.web`（根目录） | 编排层文件与 docker-compose.yml 同级 |
| `deploy/nginx.web.conf` | `nginx.web.conf`（根目录） | 编排层文件与 docker-compose.yml 同级 |
| `frontend/.env.local` (tracked) | `frontend/.env` (committed defaults) | 对齐 Vite 惯例：.env 提交默认值，.env.local 本地覆盖 |

### Files to Delete
| File | Reason |
|---|---|
| `deploy/` | 目录内容已迁移到根目录 |
| `frontend/Dockerfile` | 未被任何配置引用，属于冗余文件 |

---

### Task 1: Backend Config — 将 Port 纳入 Config 结构体 (TDD)

**Files:**
- Modify: `backend/config/config.go:9-37` (Config struct)
- Modify: `backend/config/config.go:39-71` (LoadConfig function)
- Modify: `backend/config/config_test.go`
- Modify: `backend/main.go:49-53`

- [ ] **Step 1: 写失败测试 — 验证 Port 字段默认值**

在 `backend/config/config_test.go` 中添加测试：

```go
package config

import (
	"os"
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestLoadConfig_DefaultPort(t *testing.T) {
	// 清除可能存在的 PORT 环境变量，确保测试默认值
	os.Unsetenv("PORT")

	config := LoadConfig()

	assert.Equal(t, "5000", config.Port, "默认端口应为 5000")
}

func TestLoadConfig_PortFromEnv(t *testing.T) {
	os.Setenv("PORT", "3000")
	defer os.Unsetenv("PORT")

	config := LoadConfig()

	assert.Equal(t, "3000", config.Port)
}

func TestLoadConfig_OpenAIURLDefault(t *testing.T) {
	os.Unsetenv("OPENAI_API_URL")

	config := LoadConfig()

	assert.Equal(t, "https://api.openai.com/v1", config.OpenAIAPIURL)
}

func TestLoadConfig_MaxContentLengthDefault(t *testing.T) {
	os.Unsetenv("MAX_CONTENT_LENGTH")

	config := LoadConfig()

	assert.Equal(t, int64(52428800), config.MaxContentLength, "默认上传限制应为 50MB")
}
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd /home/handy/Projects/MyWebsite/backend && go test ./config/ -v -run "TestLoadConfig_DefaultPort|TestLoadConfig_PortFromEnv|TestLoadConfig_OpenAIURLDefault|TestLoadConfig_MaxContentLengthDefault"`
Expected: FAIL — `config.Port` 字段不存在（undefined）

- [ ] **Step 3: 在 Config 结构体中添加 Port 字段**

在 `backend/config/config.go` 的 Config struct 中添加字段（在 DBName 之后、SecretKey 之前）：

```go
type Config struct {
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string

	Port        string          // ← 新增

	SecretKey    string
	// ... 其余不变
```

在 LoadConfig 函数的 return 中添加：

```go
Port:        getEnv("PORT", "5000"),
```

完整修改后的 `backend/config/config.go`：

```go
package config

import (
	"os"
	"strconv"
	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string

	Port string

	SecretKey    string
	JWTSecretKey string

	AdminUsername string
	AdminPassword string

	UploadFolder         string
	MaxContentLength     int64
	AllowedImageExtensions []string

	OpenAIAPIKey    string
	OpenAIModel     string
	OpenAIAPIURL    string

	JWTAccessTokenExpires  int
	JWTRememberTokenExpires int

	CommentLimitEnabled     bool
	CommentLimitTimeWindow  int
	CommentLimitMaxCount    int
	CommentLimitExemptAdmin bool
}

func LoadConfig() *Config {
	godotenv.Load()

	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnvInt("DB_PORT", 5432),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "password"),
		DBName:     getEnv("DB_NAME", "mywebsite"),

		Port:        getEnv("PORT", "5000"),

		SecretKey:    getEnv("SECRET_KEY", "dev-secret-key"),
		JWTSecretKey: getEnv("JWT_SECRET_KEY", "dev-jwt-secret"),

		AdminUsername: getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin123"),

		UploadFolder:         getEnv("UPLOAD_FOLDER", "uploads"),
		MaxContentLength:     getEnvInt64("MAX_CONTENT_LENGTH", 52428800),
		AllowedImageExtensions: []string{"jpg", "jpeg", "png", "webp"},

		OpenAIAPIKey:  getEnv("OPENAI_API_KEY", "sk-xxxx"),
		OpenAIModel:   getEnv("OPENAI_MODEL", "gpt-3.5-turbo"),
		OpenAIAPIURL:  getEnv("OPENAI_API_URL", "https://api.openai.com/v1"),

		JWTAccessTokenExpires:  getEnvInt("JWT_ACCESS_TOKEN_EXPIRES", 86400),
		JWTRememberTokenExpires: getEnvInt("JWT_REMEMBER_TOKEN_EXPIRES", 604800),

		CommentLimitEnabled:     getEnv("COMMENT_LIMIT_ENABLED", "true") == "true",
		CommentLimitTimeWindow:  getEnvInt("COMMENT_LIMIT_TIME_WINDOW", 24),
		CommentLimitMaxCount:    getEnvInt("COMMENT_LIMIT_MAX_COUNT", 1),
		CommentLimitExemptAdmin: getEnv("COMMENT_LIMIT_EXEMPT_ADMIN", "true") == "true",
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intVal
		}
	}
	return defaultValue
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `cd /home/handy/Projects/MyWebsite/backend && go test ./config/ -v`
Expected: PASS — 所有 4 个测试通过（包括原有的 TestLoadConfig）

- [ ] **Step 5: Commit**

```bash
cd /home/handy/Projects/MyWebsite/backend
git add config/config.go config/config_test.go
git commit -m "feat(backend): add Port field to Config struct

将 PORT 环境变量纳入统一配置管理，替代 main.go 中直接读取 os.Getenv 的方式。
添加 Port 默认值和 OpenAIAPIURL/MaxContentLength 回归测试。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Backend main.go — 使用 cfg.Port 替代 os.Getenv

**Files:**
- Modify: `backend/main.go:49-53`

- [ ] **Step 1: 修改 main.go，移除直接的 os.Getenv("PORT") 调用**

将 main.go 第 49-53 行：

```go
	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}
```

替换为：

```go
	// Start server on configured port
	port := cfg.Port
```

同时从 import 中移除 `"os"`（因为不再需要）。修改后的 import：

```go
import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/migrations"
	"github.com/handywote/website/models"
	"github.com/handywote/website/routes"
)
```

完整修改后的 main.go：

```go
package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/migrations"
	"github.com/handywote/website/models"
	"github.com/handywote/website/routes"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Connect to database (fail fast if DB unavailable)
	if err := database.Connect(cfg); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	// Auto migrate
	database.GetDB().AutoMigrate(
		&models.Article{},
		&models.Comment{},
		&models.Skill{},
		&models.Contact{},
		&models.Avatar{},
		&models.SiteBlock{},
		&models.AISetting{},
	)

	// Run smart column migrations (only add missing columns)
	if err := migrations.RunMigrations(database.GetDB()); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Seed initial data
	seedData()

	// Create Gin router
	r := gin.Default()

	// Setup routes
	routes.SetupRoutes(r, cfg)

	// Start server on configured port
	port := cfg.Port

	log.Printf("Starting server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// seedData 初始化数据
func seedData() {
	db := database.GetDB()

	// Seed SiteBlocks
	var count int64
	db.Model(&models.SiteBlock{}).Count(&count)
	if count == 0 {
		blocks := []models.SiteBlock{
			{Name: "home", Content: `{"title":"HandyWote","desc":"少年侠气交结五都雄！"}`},
			{Name: "about", Content: `{"desc":"汕头大学 | 黄应辉"}`},
		}
		db.Create(&blocks)
		log.Println("Seeded site blocks")
	}

	// Seed Skills
	db.Model(&models.Skill{}).Count(&count)
	if count == 0 {
		skills := []models.Skill{
			{Name: "Python", Description: "熟练掌握 Python 编程", Level: 90},
			{Name: "React", Description: "熟悉 React 前端开发", Level: 85},
		}
		db.Create(&skills)
		log.Println("Seeded skills")
	}

	// Seed Contacts
	db.Model(&models.Contact{}).Count(&count)
	if count == 0 {
		contacts := []models.Contact{
			{Type: "email", Value: "handywote@example.com"},
			{Type: "github", Value: "https://github.com/handywote"},
		}
		db.Create(&contacts)
		log.Println("Seeded contacts")
	}
}
```

- [ ] **Step 2: 编译验证**

Run: `cd /home/handy/Projects/MyWebsite/backend && go build -o /dev/null .`
Expected: 编译成功，无错误

- [ ] **Step 3: 运行全部测试**

Run: `cd /home/handy/Projects/MyWebsite/backend && go test ./... -v`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
cd /home/handy/Projects/MyWebsite/backend
git add main.go
git commit -m "refactor(backend): use cfg.Port instead of direct os.Getenv

统一通过 Config struct 管理所有环境变量，移除 main.go 中残留的 os.Getenv(\"PORT\") 调用。
同时移除不再需要的 \"os\" import。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 更新 backend/.env.example

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1: 更新 backend/.env.example**

将 `backend/.env.example` 替换为：

```env
# ============================================
# 后端开发环境变量模板
# 复制此文件为 .env 并根据本地环境修改
# cp .env.example .env
# ============================================

# 服务端口
PORT=5000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=mywebsite

# 安全配置（生产环境务必修改）
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production

# 管理员账号（生产环境务必修改）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 文件上传配置
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=52428800
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,webp

# OpenAI 配置（可选，留空则禁用 AI 功能）
OPENAI_API_KEY=
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_URL=https://api.openai.com/v1

# JWT 有效期（秒）
JWT_ACCESS_TOKEN_EXPIRES=86400
JWT_REMEMBER_TOKEN_EXPIRES=604800

# 评论限制配置
COMMENT_LIMIT_ENABLED=true
COMMENT_LIMIT_TIME_WINDOW=24
COMMENT_LIMIT_MAX_COUNT=1
COMMENT_LIMIT_EXEMPT_ADMIN=true
```

变更说明：
- 添加了 `PORT=5000`
- 添加了 `OPENAI_API_URL=https://api.openai.com/v1`
- `MAX_CONTENT_LENGTH` 从 `5242880`（5MB）修正为 `52428800`（50MB），与 config.go 默认值和 nginx `client_max_body_size 50M` 对齐
- `DB_HOST` 从 `host.docker.internal` 改为 `localhost`（开发环境本地连接）
- 添加了清晰的注释和复制提示
- `OPENAI_API_KEY` 改为留空（开发时按需填写）

- [ ] **Step 2: 验证 .env.example 与 config.go 一致**

逐一对比 config.go 中 getEnv/getEnvInt/getEnvInt64 的 key 和默认值，确认 .env.example 中每一项都有对应条目且默认值一致。

- [ ] **Step 3: Commit**

```bash
cd /home/handy/Projects/MyWebsite
git add backend/.env.example
git commit -m "docs(backend): update .env.example with missing vars and correct defaults

- 添加 PORT 和 OPENAI_API_URL
- 修正 MAX_CONTENT_LENGTH 为 50MB（与 config.go 和 nginx 对齐）
- DB_HOST 默认值改为 localhost（开发环境）
- 添加清晰的分组注释

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 创建 frontend/.env.example 并迁移 .env.local

**Files:**
- Create: `frontend/.env.example`
- Create: `frontend/.env` (从 .env.local 迁移)
- Modify: `.gitignore`

- [ ] **Step 1: 创建 frontend/.env.example**

```env
# ============================================
# 前端开发环境变量模板
# 复制此文件为 .env 并根据本地环境修改
# cp .env.example .env
# ============================================

# API 基础地址
# 开发环境留空则走 Vite 代理（默认 http://localhost:5000）
# 如需指向远程后端，取消注释并填写：
# VITE_API_BASE_URL=http://localhost:5000
VITE_API_BASE_URL=

# 应用标题（可选）
# VITE_APP_TITLE=我的网站

# 应用版本（可选）
# VITE_APP_VERSION=1.0.0
```

- [ ] **Step 2: 创建 frontend/.env（提交的默认值文件）**

```env
# API配置
# 开发环境API地址（留空走 Vite 代理）
# VITE_API_BASE_URL=http://localhost:5000

# 生产环境API地址（Docker环境内通过Nginx代理访问，使用相对路径）
VITE_API_BASE_URL=
```

- [ ] **Step 3: 更新 .gitignore — 让 frontend/.env 可被提交**

在 `.gitignore` 第 18 行 `.env` 之后、`venv/` 之前添加例外：

```gitignore
.env
!frontend/.env
!.env.example
```

同时移除第 69-70 行的 `*.local` / `!.env.local` 块（整个删除这两行）。

完整的 `.gitignore` 修改区域（第 17-24 行区域）：

```gitignore
# 环境变量
.env
!frontend/.env
!.env.example

# Python virtualenv
venv/
env/
ENV/
.venv/
.ENV/
```

以及移除第 68-70 行：

```gitignore
# 删除这两行：
*.local
!.env.local
```

- [ ] **Step 4: 停止追踪 frontend/.env.local**

Run: `cd /home/handy/Projects/MyWebsite && git rm --cached frontend/.env.local`

- [ ] **Step 5: 验证 git 状态**

Run: `cd /home/handy/Projects/MyWebsite && git status`
Expected:
- `frontend/.env.example` — new file (untracked)
- `frontend/.env` — new file (untracked)
- `.gitignore` — modified
- `frontend/.env.local` — deleted from index

- [ ] **Step 6: Commit**

```bash
cd /home/handy/Projects/MyWebsite
git add frontend/.env.example frontend/.env .gitignore
git rm --cached frontend/.env.local
git commit -m "feat(frontend): create .env.example and migrate .env.local to .env

- 新建 frontend/.env.example 作为开发环境模板
- 将 frontend/.env.local 内容迁移到 frontend/.env（对齐 Vite 惯例）
- .env.local 不再纳入版本控制（本地覆盖用）
- .gitignore 添加 frontend/.env 例外以允许提交默认值

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 创建根目录 .env.example

**Files:**
- Create: `.env.example`

- [ ] **Step 1: 创建根目录 .env.example**

```env
# ============================================
# MyWebsite 生产部署环境变量模板
# 复制此文件为 .env 并填写实际值：
#   cp .env.example .env
# Docker Compose 会自动读取同目录下的 .env 文件
# ============================================

# ============================
# 后端服务
# ============================

# 服务端口
PORT=5000

# 数据库配置
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=change-this-password
DB_NAME=mywebsite

# 安全配置（⚠️ 生产环境务必修改）
SECRET_KEY=change-this-in-production
JWT_SECRET_KEY=change-this-in-production

# 管理员账号（⚠️ 生产环境务必修改）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password

# 文件上传
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=52428800
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,webp

# OpenAI 配置（可选，留空则禁用 AI 功能）
OPENAI_API_KEY=
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_URL=https://api.openai.com/v1

# JWT 有效期（秒）
JWT_ACCESS_TOKEN_EXPIRES=86400
JWT_REMEMBER_TOKEN_EXPIRES=604800

# 评论限制
COMMENT_LIMIT_ENABLED=true
COMMENT_LIMIT_TIME_WINDOW=24
COMMENT_LIMIT_MAX_COUNT=1
COMMENT_LIMIT_EXEMPT_ADMIN=true

# ============================
# 前端服务
# ============================

# 构建时注入的变量（仅 VITE_ 前缀变量会嵌入前端代码）
# 留空表示通过 Nginx 代理访问后端（推荐）
# 如需指向独立后端地址，填写完整 URL：
# VITE_API_BASE_URL=https://api.yoursite.com
VITE_API_BASE_URL=

# ============================
# Docker / 公共配置
# ============================

TZ=Asia/Shanghai
```

- [ ] **Step 2: 验证根目录 .env 已被 .gitignore 排除**

Run: `cd /home/handy/Projects/MyWebsite && git check-ignore .env`
Expected: `.env`（输出文件名，表示被忽略）

- [ ] **Step 3: Commit**

```bash
cd /home/handy/Projects/MyWebsite
git add .env.example
git commit -m "docs: create root .env.example for production deployment

包含后端和前端的全部环境变量模板，按服务分组并附注释。
Docker Compose 自动读取根目录 .env 文件进行变量插值。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: 更新 docker-compose.yml — 使用 ${VAR} 插值

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: 替换 docker-compose.yml 的后端配置**

将 backend 服务的 `env_file` 替换为显式的 `environment` 块。前端服务增加 `build.args`。

```yaml
services:
  # 后端服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      # 服务端口
      PORT: ${PORT:-5000}
      # 数据库
      DB_HOST: ${DB_HOST:-host.docker.internal}
      DB_PORT: ${DB_PORT:-5432}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-password}
      DB_NAME: ${DB_NAME:-mywebsite}
      # 安全配置
      SECRET_KEY: ${SECRET_KEY:-dev-secret-key-change-in-production}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY:-dev-jwt-secret-change-in-production}
      # 管理员账号
      ADMIN_USERNAME: ${ADMIN_USERNAME:-admin}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-admin123}
      # 文件上传
      UPLOAD_FOLDER: ${UPLOAD_FOLDER:-uploads}
      MAX_CONTENT_LENGTH: ${MAX_CONTENT_LENGTH:-52428800}
      ALLOWED_IMAGE_EXTENSIONS: ${ALLOWED_IMAGE_EXTENSIONS:-jpg,jpeg,png,webp}
      # OpenAI
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      OPENAI_MODEL: ${OPENAI_MODEL:-gpt-3.5-turbo}
      OPENAI_API_URL: ${OPENAI_API_URL:-https://api.openai.com/v1}
      # JWT 有效期
      JWT_ACCESS_TOKEN_EXPIRES: ${JWT_ACCESS_TOKEN_EXPIRES:-86400}
      JWT_REMEMBER_TOKEN_EXPIRES: ${JWT_REMEMBER_TOKEN_EXPIRES:-604800}
      # 评论限制
      COMMENT_LIMIT_ENABLED: ${COMMENT_LIMIT_ENABLED:-true}
      COMMENT_LIMIT_TIME_WINDOW: ${COMMENT_LIMIT_TIME_WINDOW:-24}
      COMMENT_LIMIT_MAX_COUNT: ${COMMENT_LIMIT_MAX_COUNT:-1}
      COMMENT_LIMIT_EXEMPT_ADMIN: ${COMMENT_LIMIT_EXEMPT_ADMIN:-true}
      # 时区
      TZ: ${TZ:-Asia/Shanghai}
    volumes:
      - ./backend/uploads:/app/uploads
    networks:
      - Web_network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    extra_hosts:
      - "host.docker.internal:host-gateway"

  # 前端服务（Nginx）
  frontend:
    build:
      context: .
      dockerfile: ./Dockerfile.web
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL:-}
    ports:
      - "4419:80"
    networks:
      - Web_network
    restart: always
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # postgres:
  #   image: docker.xuanyuan.me/pgvector/pgvector:pg17
  #   container_name: mywebsite-postgres
  #   environment:
  #     POSTGRES_DB: mywebsite
  #     POSTGRES_USER: postgres
  #     POSTGRES_PASSWORD: password
  #     TZ: ${TZ:-Asia/Shanghai}
  #   ports:
  #     - 5432:5432
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data
  #   networks:
  #     - Web_network
  #   restart: always
  #   healthcheck:
  #     test: ["CMD-SHELL", "pg_isready -U postgres -d mywebsite"]
  #     interval: 20s
  #     timeout: 10s
  #     retries: 5
  #     start_period: 30s

networks:
  Web_network:
    driver: bridge

# volumes:
#   postgres_data:
```

- [ ] **Step 2: 验证 compose 文件语法**

Run: `cd /home/handy/Projects/MyWebsite && docker compose config --quiet`
Expected: 无错误输出（退出码 0）。如果 docker compose 不可用，可跳过此步骤。

- [ ] **Step 3: Commit**

```bash
cd /home/handy/Projects/MyWebsite
git add docker-compose.yml
git commit -m "feat(deploy): switch docker-compose to root .env variable interpolation

将后端服务的 env_file 替换为显式 environment 块，使用 \${VAR:-default} 语法
从根目录 .env 读取变量。前端服务增加 build args 传递 VITE_API_BASE_URL。
生产部署只需在根目录维护一份 .env 文件。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: 部署结构扁平化 — 合并 deploy/ 到根目录

**Files:**
- Move: `deploy/Dockerfile.web` → `Dockerfile.web`（根目录）
- Move: `deploy/nginx.web.conf` → `nginx.web.conf`（根目录）
- Delete: `frontend/Dockerfile`（未被任何配置引用的冗余文件）

- [ ] **Step 1: 移动文件到根目录**

```bash
cd /home/handy/Projects/MyWebsite
mv deploy/Dockerfile.web Dockerfile.web
mv deploy/nginx.web.conf nginx.web.conf
```

- [ ] **Step 2: 更新 Dockerfile.web 中的 nginx.conf COPY 路径**

将 `Dockerfile.web` 中的：

```dockerfile
COPY deploy/nginx.web.conf /etc/nginx/nginx.conf
```

替换为：

```dockerfile
COPY nginx.web.conf /etc/nginx/nginx.conf
```

完整修改后的 `Dockerfile.web`：

```dockerfile
FROM docker.1ms.run/node:18-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci
COPY frontend/ ./
RUN npm run build

FROM docker.1ms.run/node:18-alpine AS scene-builder

WORKDIR /build/3Dend
COPY 3Dend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install
COPY 3Dend/ ./
RUN npm run build

FROM docker.1ms.run/nginx:alpine

RUN rm -rf /etc/nginx/conf.d/*

COPY nginx.web.conf /etc/nginx/nginx.conf
COPY frontend/mime.types /etc/nginx/mime.types

COPY --from=scene-builder /build/3Dend/dist/ /usr/share/nginx/html/
COPY --from=frontend-builder /build/frontend/dist/ /usr/share/nginx/html/app/

RUN chmod -R 644 /usr/share/nginx/html/ && \
    find /usr/share/nginx/html/ -type d -exec chmod 755 {} \;

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: 删除冗余文件**

```bash
cd /home/handy/Projects/MyWebsite
rm -f frontend/Dockerfile
rm -rf deploy/
```

- [ ] **Step 4: 验证 docker-compose.yml 引用路径正确**

确认 `docker-compose.yml` 中 frontend 服务的 dockerfile 路径（Task 6 已改为 `./Dockerfile.web`）。

Run: `cd /home/handy/Projects/MyWebsite && docker compose config --quiet 2>&1 || echo "docker compose 不可用，跳过验证"`
Expected: 无错误（或 docker compose 不可用提示）

- [ ] **Step 5: Commit**

```bash
cd /home/handy/Projects/MyWebsite
git add Dockerfile.web nginx.web.conf
git rm deploy/Dockerfile.web deploy/nginx.web.conf
git rm frontend/Dockerfile
git commit -m "refactor(deploy): flatten deployment structure to root directory

将 deploy/ 目录内容（Dockerfile.web + nginx.web.conf）合并到根目录，
与 docker-compose.yml 同级。删除未被引用的 frontend/Dockerfile。
消除 deploy/ 这个多余的间接层。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: 更新 Dockerfile.web — 传递前端构建参数

**Files:**
- Modify: `Dockerfile.web`（根目录，Task 7 已移来）

- [ ] **Step 1: 在 frontend-builder 阶段添加 ARG/ENV**

在 `Dockerfile.web` 中，在 frontend-builder 阶段的 `WORKDIR` 之前添加 ARG 和 ENV：

```dockerfile
FROM docker.1ms.run/node:18-alpine AS frontend-builder

# 前端构建时环境变量（从 docker-compose build args 传入）
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

WORKDIR /build/frontend
```

完整修改后的 `Dockerfile.web`：

```dockerfile
FROM docker.1ms.run/node:18-alpine AS frontend-builder

# 前端构建时环境变量（从 docker-compose build args 传入）
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci
COPY frontend/ ./
RUN npm run build

FROM docker.1ms.run/node:18-alpine AS scene-builder

WORKDIR /build/3Dend
COPY 3Dend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install
COPY 3Dend/ ./
RUN npm run build

FROM docker.1ms.run/nginx:alpine

RUN rm -rf /etc/nginx/conf.d/*

COPY nginx.web.conf /etc/nginx/nginx.conf
COPY frontend/mime.types /etc/nginx/mime.types

COPY --from=scene-builder /build/3Dend/dist/ /usr/share/nginx/html/
COPY --from=frontend-builder /build/frontend/dist/ /usr/share/nginx/html/app/

RUN chmod -R 644 /usr/share/nginx/html/ && \
    find /usr/share/nginx/html/ -type d -exec chmod 755 {} \;

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Commit**

```bash
cd /home/handy/Projects/MyWebsite
git add Dockerfile.web
git commit -m "feat(deploy): add VITE_API_BASE_URL build arg to Dockerfile.web

通过 ARG/ENV 将 VITE_API_BASE_URL 从 docker-compose 传递到 Vite 构建阶段，
实现生产部署时通过根目录 .env 控制前端 API 地址。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: 更新文档

**Files:**
- Modify: `backend/README.md`

- [ ] **Step 1: 更新 backend/README.md**

将 backend/README.md 中环境变量相关部分更新为：

```markdown
# 后端服务

## 本地开发

```bash
# 复制环境变量模板
cp .env.example .env

# 根据本地环境修改 .env（默认连接 localhost:5432）

# 启动开发服务器
go run main.go
```

默认监听 `5000` 端口。配置来自 `backend/.env`（通过 godotenv 加载）。

## 测试

```bash
go test ./...
```

## Docker 构建

```bash
docker build -t mywebsite-backend .
```

## 环境变量

所有变量均在 `backend/.env` 中配置，参见 `.env.example`：

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `5000` | 服务监听端口 |
| `DB_HOST` | `localhost` | 数据库主机 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_USER` | `postgres` | 数据库用户名 |
| `DB_PASSWORD` | `password` | 数据库密码 |
| `DB_NAME` | `mywebsite` | 数据库名 |
| `SECRET_KEY` | `dev-secret-key` | 应用密钥（⚠️ 生产环境务必修改） |
| `JWT_SECRET_KEY` | `dev-jwt-secret` | JWT 签名密钥（⚠️ 生产环境务必修改） |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | `admin123` | 管理员密码（⚠️ 生产环境务必修改） |
| `UPLOAD_FOLDER` | `uploads` | 上传文件目录 |
| `MAX_CONTENT_LENGTH` | `52428800` | 最大上传大小（字节，默认 50MB） |
| `ALLOWED_IMAGE_EXTENSIONS` | `jpg,jpeg,png,webp` | 允许的图片格式 |
| `OPENAI_API_KEY` | _(空)_ | OpenAI API 密钥 |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI 模型 |
| `OPENAI_API_URL` | `https://api.openai.com/v1` | OpenAI API 地址 |
| `JWT_ACCESS_TOKEN_EXPIRES` | `86400` | Access Token 有效期（秒） |
| `JWT_REMEMBER_TOKEN_EXPIRES` | `604800` | Remember Token 有效期（秒） |
| `COMMENT_LIMIT_ENABLED` | `true` | 是否启用评论限制 |
| `COMMENT_LIMIT_TIME_WINDOW` | `24` | 评论限制时间窗口（小时） |
| `COMMENT_LIMIT_MAX_COUNT` | `1` | 时间窗口内最大评论数 |
| `COMMENT_LIMIT_EXEMPT_ADMIN` | `true` | 管理员是否免于评论限制 |

## API 端点

- 健康检查: `GET /health`
- 公共 API: `GET /api/*`
- 管理后台 API: `/api/admin/*`
```

- [ ] **Step 2: Commit**

```bash
cd /home/handy/Projects/MyWebsite
git add backend/README.md
git commit -m "docs(backend): update README with complete env var reference

添加完整的环境变量表格，包含新增的 PORT 和 OPENAI_API_URL。
更新本地开发说明，强调 cp .env.example .env 步骤。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

**1. Spec 覆盖检查：**

| 需求 | 对应 Task |
|---|---|
| 开发环境各端读各自 .env | Task 3 (backend/.env.example) + Task 4 (frontend/.env) |
| 各端有 .env.example 模板 | Task 3 + Task 4 |
| 生产部署根目录 .env | Task 5 (.env.example) + Task 6 (docker-compose.yml) |
| Docker Compose 变量插值 | Task 6 |
| 前端构建时注入变量 | Task 8 (Dockerfile.web) |
| PORT 纳入统一配置 | Task 1 + Task 2 |
| MAX_CONTENT_LENGTH 一致性 | Task 3 |
| OPENAI_API_URL 记录 | Task 3 |
| 部署结构扁平化（合并 deploy/） | Task 7 |
| 删除冗余 frontend/Dockerfile | Task 7 |
| 文档更新 | Task 9 |

**2. Placeholder 扫描：** 无 TBD/TODO/"similar to" 等占位符。所有步骤包含完整代码。

**3. 类型一致性检查：** Config.Port 类型为 string，main.go 使用 string 拼接 `":" + port`，docker-compose.yml 传入字符串 `${PORT:-5000}`。一致 ✓
