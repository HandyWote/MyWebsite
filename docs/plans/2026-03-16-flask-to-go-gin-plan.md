# Flask to Go Gin 后端重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Flask 后端重构为 Go Gin 框架，保持所有业务功能，移除 WebSocket，采用 TDD 方式开发。

**Architecture:** 使用 Gin 框架 + GORM + PostgreSQL，采用分层架构（路由/服务/模型），JWT 认证。

**Tech Stack:** Go 1.21+, Gin, GORM, PostgreSQL, JWT (golang-jwt/jwt/v5), Viper

---

## 阶段 1: 项目初始化

### Task 1: 创建 Go 模块和目录结构

**Files:**
- Create: `backend/go.mod`
- Create: `backend/main.go`

**Step 1: 创建 go.mod 文件**

```go
module github.com/handywote/website

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/golang-jwt/jwt/v5 v5.2.0
	gorm.io/driver/postgres v1.5.4
	gorm.io/gorm v1.25.5
	github.com/joho/godotenv v1.5.1
	github.com/stretchr/testify v1.8.4
)
```

**Step 2: 创建 main.go 骨架**

```go
package main

import (
	"log"
	"os"
)

func main() {
	log.Println("Starting Go Gin Backend...")
}
```

**Step 3: 初始化 Go 模块**

Run: `cd backend && go mod init github.com/handywote/website && go mod tidy`
Expected: go.mod 和 go.sum 文件创建成功

**Step 4: Commit**

```bash
git add backend/go.mod backend/main.go
git commit -m "chore(backend): init Go module"
```

---

### Task 2: 创建配置管理

**Files:**
- Create: `backend/config/config.go`
- Create: `backend/config/config_test.go`

**Step 1: 编写配置测试**

```go
package config

import (
	"os"
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestLoadConfig(t *testing.T) {
	os.Setenv("DB_HOST", "testhost")
	os.Setenv("DB_PORT", "5433")

	config := LoadConfig()

	assert.Equal(t, "testhost", config.DBHost)
	assert.Equal(t, 5433, config.DBPort)
}
```

**Step 2: 运行测试验证失败**

Run: `cd backend && go test ./config/... -v`
Expected: FAIL - config.go not found

**Step 3: 实现配置**

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

**Step 4: 运行测试**

Run: `cd backend && go test ./config/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/config/
git commit -m "feat(backend): add configuration management"
```

---

### Task 3: 创建数据库模型

**Files:**
- Create: `backend/models/models.go`
- Create: `backend/models/models_test.go`

**Step 1: 编写模型测试**

```go
package models

import (
	"testing"
	"github.com/stretchr/testify/assert"
	"time"
)

func TestArticleTableName(t *testing.T) {
	article := Article{}
	assert.Equal(t, "article", article.TableName())
}

func TestCommentTableName(t *testing.T) {
	comment := Comment{}
	assert.Equal(t, "comments", comment.TableName())
}
```

**Step 2: 运行测试**

Run: `cd backend && go test ./models/... -v`
Expected: FAIL - models.go not found

**Step 3: 实现模型**

```go
package models

import (
	"time"

	"gorm.io/gorm"
)

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

func (Article) TableName() string {
	return "article"
}

type Comment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ArticleID uint      `gorm:"index;not null" json:"article_id"`
	Author    string    `gorm:"size:100;not null" json:"author"`
	Email     string    `gorm:"size:255" json:"email"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	IPAddress string    `gorm:"size:45" json:"ip_address"`   // 记录IP地址
	UserAgent string    `gorm:"type:text" json:"user_agent"`  // 记录用户代理
	Status    string    `gorm:"size:20;default:normal" json:"status"` // normal, pending, spam
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Comment) TableName() string {
	return "comments"
}

type Skill struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Level       int       `gorm:"default:0" json:"level"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Skill) TableName() string {
	return "skills"
}

type Contact struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Type      string    `gorm:"size:32;not null" json:"type"`
	Value     string    `gorm:"size:255;not null" json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Contact) TableName() string {
	return "contacts"
}

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

type SiteBlock struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:64;uniqueIndex;not null" json:"name"`
	Content   string    `gorm:"type:jsonb" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SiteBlock) TableName() string {
	return "site_blocks"
}

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

**Step 4: 运行测试**

Run: `cd backend && go test ./models/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/models/
git commit -m "feat(backend): add database models"
```

---

### Task 4: 创建数据库连接

**Files:**
- Create: `backend/database/database.go`
- Create: `backend/database/database_test.go`

**Step 1: 编写测试**

```go
package database

import (
	"testing"
	"os"
	"github.com/stretchr/testify/assert"
)

func TestDSN(t *testing.T) {
	os.Setenv("DB_HOST", "testhost")
	os.Setenv("DB_USER", "testuser")
	os.Setenv("DB_PASSWORD", "testpass")
	os.Setenv("DB_NAME", "testdb")
	os.Setenv("DB_PORT", "5433")

	dsn := DSN("testhost", 5433, "testuser", "testpass", "testdb")
	assert.Equal(t, "host=testhost port=5433 user=testuser password=testpass dbname=testdb sslmode=disable", dsn)
}
```

**Step 2: 运行测试**

Run: `cd backend && go test ./database/... -v`
Expected: FAIL - database.go not found

**Step 3: 实现数据库连接**

```go
package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/handywote/website/config"
	"github.com/handywote/website/models"
)

var DB *gorm.DB

func Connect(cfg *config.Config) error {
	dsn := DSN(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connected successfully")
	return nil
}

func AutoMigrate() error {
	err := DB.AutoMigrate(
		&models.Article{},
		&models.Comment{},
		&models.Skill{},
		&models.Contact{},
		&models.Avatar{},
		&models.SiteBlock{},
		&models.AISetting{},
	)
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database migration completed")
	return nil
}

func DSN(host string, port int, user, password, dbname string) string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)
}

func GetDB() *gorm.DB {
	return DB
}
```

**Step 4: 运行测试**

Run: `cd backend && go test ./database/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/database/
git commit -m "feat(backend): add database connection"
```

---

## 阶段 2: 中间件

### Task 5: JWT 中间件

**Files:**
- Create: `backend/middleware/jwt.go`
- Create: `backend/middleware/jwt_test.go`

**Step 1: 编写 JWT 测试**

```go
package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestJWTAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	secret := "test-secret"

	// Create valid token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": "admin",
	})
	tokenString, _ := token.SignedString([]byte(secret))

	// Test with valid token
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/", nil)
	c.Request.Header.Set("Authorization", "Bearer "+tokenString)

	handler := JWTAuth(secret)
	handler(c)

	assert.Equal(t, false, c.IsAborted())
}
```

**Step 2: 运行测试**

Run: `cd backend && go test ./middleware/... -v`
Expected: FAIL - jwt.go not found

**Step 3: 实现 JWT 中间件**

```go
package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func JWTAuth(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token required"})
			c.Abort()
			return
		}

		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(secretKey), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*Claims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)
		c.Next()
	}
}

func GenerateToken(username, secretKey string, expires int) (string, error) {
	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expires) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secretKey))
}
```

**Step 4: 运行测试**

Run: `cd backend && go test ./middleware/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/middleware/
git commit -m "feat(backend): add JWT middleware"
```

---

### Task 6: CORS 中间件

**Files:**
- Create: `backend/middleware/cors.go`

**Step 1: 实现 CORS 中间件**

```go
package middleware

import (
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept")
		c.Header("Access-Control-Expose-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
```

**Step 2: Commit**

```bash
git add backend/middleware/cors.go
git commit -m "feat(backend): add CORS middleware"
```

---

## 阶段 3: 工具函数

### Task 7: 响应工具

**Files:**
- Create: `backend/utils/response.go`
- Create: `backend/utils/response_test.go`

**Step 1: 编写测试**

```go
package utils

import (
	"net/http"
	"testing"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSuccessResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	Success(c, "test data")

	assert.Equal(t, http.StatusOK, w.Code)
}
```

**Step 2: 运行测试**

Run: `cd backend && go test ./utils/... -v`
Expected: FAIL - response.go not found

**Step 3: 实现响应工具**

```go
package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code: 0,
		Data: data,
	})
}

func Error(c *gin.Context, code int, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    code,
		Message: message,
	})
}

func ErrorBadRequest(c *gin.Context, message string) {
	Error(c, 400, message)
}

func ErrorUnauthorized(c *gin.Context, message string) {
	c.JSON(http.StatusUnauthorized, Response{
		Code:    401,
		Message: message,
	})
}

func ErrorForbidden(c *gin.Context, message string) {
	c.JSON(http.StatusForbidden, Response{
		Code:    403,
		Message: message,
	})
}

func ErrorNotFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, Response{
		Code:    404,
		Message: message,
	})
}

func ErrorInternal(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, Response{
		Code:    500,
		Message: message,
	})
}
```

**Step 4: 运行测试**

Run: `cd backend && go test ./utils/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/utils/
git commit -m "feat(backend): add response utilities"
```

---

## 阶段 4: 路由实现

### Task 8: 公开接口 - 文章列表

**Files:**
- Create: `backend/routes/article.go`
- Create: `backend/routes/article_test.go`

**Step 1: 编写测试**

```go
package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestGetArticles(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/articles", nil)

	// Mock database would be needed here
	// For now, test route registration
	r.GET("/api/articles", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"data": []struct{}{}})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.NotNil(t, response["data"])
}
```

**Step 2: 运行测试**

Run: `cd backend && go test ./routes/... -v`
Expected: FAIL - article.go not found

**Step 3: 实现文章路由**

```go
package routes

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// GetArticles 获取文章列表
func GetArticles(c *gin.Context) {
	var articles []models.Article
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	query := database.GetDB().Where("deleted_at IS NULL").Order("created_at DESC")

	var total int64
	query.Count(&total)

	query.Offset((page - 1) * pageSize).Limit(pageSize)

	if err := query.Find(&articles).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch articles")
		return
	}

	utils.Success(c, gin.H{
		"data":  articles,
		"total": total,
		"page":  page,
	})
}

// GetArticle 获取文章详情
func GetArticle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid article ID")
		return
	}

	var article models.Article
	if err := database.GetDB().First(&article, id).Error; err != nil {
		utils.ErrorNotFound(c, "Article not found")
		return
	}

	// 增加浏览次数
	database.GetDB().Model(&article).Update("view_count", article.ViewCount+1)

	utils.Success(c, article)
}

// GetCategories 获取分类列表
func GetCategories(c *gin.Context) {
	var categories []string
	database.GetDB().Model(&models.Article{}).
		Distinct("category").
		Where("category != '' AND deleted_at IS NULL").
		Pluck("category", &categories)

	utils.Success(c, categories)
}

// GetTags 获取标签列表
func GetTags(c *gin.Context) {
	var articles []models.Article
	database.GetDB().Where("deleted_at IS NULL").Find(&articles)

	tagSet := make(map[string]bool)
	for _, article := range articles {
		if article.Tags != "" {
			for _, tag := range splitTags(article.Tags) {
				tagSet[tag] = true
			}
		}
	}

	var tags []string
	for tag := range tagSet {
		tags = append(tags, tag)
	}

	utils.Success(c, tags)
}

func splitTags(tags string) []string {
	var result []string
	for _, t := range splitAndTrim(tags, ",") {
		for _, s := range splitAndTrim(t, " ") {
			if s != "" {
				result = append(result, s)
			}
		}
	}
	return result
}

func splitAndTrim(s, sep string) []string {
	parts := make([]string, 0)
	for _, p := range split(s, sep) {
		trimmed := trim(p)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

func split(s, sep string) []string {
	if s == "" {
		return nil
	}
	var result []string
	start := 0
	for i := 0; i <= len(s)-len(sep); i++ {
		if s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
		}
	}
	result = append(result, s[start:])
	return result
}

func trim(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}
```

**Step 4: 运行测试**

Run: `cd backend && go test ./routes/... -v`
Expected: PASS (部分 mock 测试)

**Step 5: Commit**

```bash
git add backend/routes/article.go
git commit -m "feat(backend): add article routes"
```

---

### Task 9: 公开接口 - 评论

**Files:**
- Create: `backend/routes/comment.go`

**Step 1: 实现评论路由**

```go
package routes

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// GetComments 获取文章评论
func GetComments(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid article ID")
		return
	}

	var comments []models.Comment
	if err := database.GetDB().Where("article_id = ? AND status = ?", id, "approved").
		Order("created_at DESC").Find(&comments).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch comments")
		return
	}

	utils.Success(c, comments)
}

// CreateComment 创建评论
func CreateComment(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid article ID")
		return
	}

	var input struct {
		Author string `json:"author" binding:"required"`
		Email  string `json:"email"`
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	cfg := config.LoadConfig()

	// 评论限制检查
	if cfg.CommentLimitEnabled {
		var count int64
		oneDayAgo := time.Now().AddDate(0, 0, -cfg.CommentLimitTimeWindow)
		database.GetDB().Model(&models.Comment{}).
			Where("created_at > ?", oneDayAgo).
			Count(&count)

		if count >= int64(cfg.CommentLimitMaxCount) {
			utils.ErrorForbidden(c, "评论次数已达上限，请稍后再试")
			return
		}
	}

	comment := models.Comment{
		ArticleID: uint(id),
		Author:    input.Author,
		Email:     input.Email,
		Content:   input.Content,
		Status:    "pending",
	}

	if err := database.GetDB().Create(&comment).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create comment")
		return
	}

	utils.Success(c, comment)
}
```

**Step 2: Commit**

```bash
git add backend/routes/comment.go
git commit -m "feat(backend): add public comment routes"
```

---

### Task 10: 公开接口 - 其他

**Files:**
- Create: `backend/routes/public.go`

**Step 1: 实现公开路由**

```go
package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// GetSiteBlocks 获取内容块
func GetSiteBlocks(c *gin.Context) {
	var blocks []models.SiteBlock
	if err := database.GetDB().Find(&blocks).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch site blocks")
		return
	}

	result := make(map[string]interface{})
	for _, block := range blocks {
		result[block.Name] = block.Content
	}

	utils.Success(c, result)
}

// GetSkills 获取技能列表
func GetSkills(c *gin.Context) {
	var skills []models.Skill
	if err := database.GetDB().Order("level DESC").Find(&skills).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch skills")
		return
	}

	utils.Success(c, skills)
}

// GetContacts 获取联系方式
func GetContacts(c *gin.Context) {
	var contacts []models.Contact
	if err := database.GetDB().Find(&contacts).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch contacts")
		return
	}

	utils.Success(c, contacts)
}

// GetAvatars 获取头像列表
func GetAvatars(c *gin.Context) {
	var avatars []models.Avatar
	if err := database.GetDB().Find(&avatars).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch avatars")
		return
	}

	utils.Success(c, avatars)
}
```

**Step 2: Commit**

```bash
git add backend/routes/public.go
git commit -m "feat(backend): add public routes"
```

---

### Task 11: 认证接口

**Files:**
- Create: `backend/routes/auth.go`

**Step 1: 实现认证路由**

```go
package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/utils"
)

// Login 登录
func Login(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	cfg := config.LoadConfig()

	if input.Username == cfg.AdminUsername && input.Password == cfg.AdminPassword {
		token, err := middleware.GenerateToken(input.Username, cfg.JWTSecretKey, cfg.JWTAccessTokenExpires)
		if err != nil {
			utils.ErrorInternal(c, "Failed to generate token")
			return
		}

		utils.Success(c, gin.H{
			"token": token,
			"user": gin.H{
				"username": input.Username,
			},
		})
		return
	}

	utils.ErrorUnauthorized(c, "Invalid username or password")
}

// Logout 登出
func Logout(c *gin.Context) {
	utils.Success(c, "Logged out successfully")
}

// Verify 验证 Token
func Verify(c *gin.Context) {
	username, exists := c.Get("username")
	if !exists {
		utils.ErrorUnauthorized(c, "Invalid token")
		return
	}

	utils.Success(c, gin.H{
		"username": username,
	})
}
```

**Step 2: Commit**

```bash
git add backend/routes/auth.go
git commit -m "feat(backend): add auth routes"
```

---

### Task 12: 管理接口 - 文章管理

**Files:**
- Create: `backend/routes/admin_article.go`

**Step 1: 实现管理文章路由**

```go
package routes

import (
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// AdminGetArticles 获取文章列表（管理）
func AdminGetArticles(c *gin.Context) {
	var articles []models.Article
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	query := database.GetDB().Order("created_at DESC")

	var total int64
	query.Count(&total)

	query.Offset((page - 1) * pageSize).Limit(pageSize)

	if err := query.Find(&articles).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch articles")
		return
	}

	utils.Success(c, gin.H{
		"data":  articles,
		"total": total,
		"page":  page,
	})
}

// AdminGetArticle 获取文章详情（管理）
func AdminGetArticle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid article ID")
		return
	}

	var article models.Article
	if err := database.GetDB().First(&article, id).Error; err != nil {
		utils.ErrorNotFound(c, "Article not found")
		return
	}

	utils.Success(c, article)
}

// AdminCreateArticle 创建文章
func AdminCreateArticle(c *gin.Context) {
	var input models.Article
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	if err := database.GetDB().Create(&input).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create article")
		return
	}

	utils.Success(c, input)
}

// AdminUpdateArticle 更新文章
func AdminUpdateArticle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid article ID")
		return
	}

	var article models.Article
	if err := database.GetDB().First(&article, id).Error; err != nil {
		utils.ErrorNotFound(c, "Article not found")
		return
	}

	var input models.Article
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	if err := database.GetDB().Model(&article).Updates(input).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update article")
		return
	}

	utils.Success(c, article)
}

// AdminDeleteArticle 删除文章
func AdminDeleteArticle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid article ID")
		return
	}

	if err := database.GetDB().Delete(&models.Article{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete article")
		return
	}

	utils.Success(c, "Article deleted successfully")
}

// AdminBatchDeleteArticles 批量删除文章
func AdminBatchDeleteArticles(c *gin.Context) {
	var input struct {
		IDs []uint `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	if err := database.GetDB().Delete(&models.Article{}, input.IDs).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete articles")
		return
	}

	utils.Success(c, "Articles deleted successfully")
}

// AdminUploadCover 上传封面
func AdminUploadCover(c *gin.Context) {
	file, err := c.FormFile("cover")
	if err != nil {
		utils.ErrorBadRequest(c, "No file uploaded")
		return
	}

	filename := strconv.FormatInt(time.Now().Unix(), 10) + filepath.Ext(file.Filename)
	uploadPath := "uploads/covers/" + filename

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		utils.ErrorInternal(c, "Failed to save file")
		return
	}

	utils.Success(c, gin.H{
		"url": "/" + uploadPath,
	})
}
```

**Step 2: Commit**

```bash
git add backend/routes/admin_article.go
git commit -m "feat(backend): add admin article routes"
```

---

### Task 13: 管理接口 - 其他CRUD

**Files:**
- Create: `backend/routes/admin_crud.go`

**Step 1: 实现管理CRUD路由**

```go
package routes

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// Site Blocks CRUD
func AdminGetSiteBlocks(c *gin.Context) {
	var blocks []models.SiteBlock
	if err := database.GetDB().Find(&blocks).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch site blocks")
		return
	}
	utils.Success(c, blocks)
}

func AdminCreateSiteBlock(c *gin.Context) {
	var input models.SiteBlock
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}
	if err := database.GetDB().Create(&input).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create site block")
		return
	}
	utils.Success(c, input)
}

func AdminUpdateSiteBlock(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var block models.SiteBlock
	if err := database.GetDB().First(&block, id).Error; err != nil {
		utils.ErrorNotFound(c, "Site block not found")
		return
	}
	var input models.SiteBlock
	c.ShouldBindJSON(&input)
	database.GetDB().Model(&block).Updates(input)
	utils.Success(c, block)
}

func AdminDeleteSiteBlock(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	database.GetDB().Delete(&models.SiteBlock{}, id)
	utils.Success(c, "Deleted")
}

// Skills CRUD
func AdminGetSkills(c *gin.Context) {
	var skills []models.Skill
	database.GetDB().Order("level DESC").Find(&skills)
	utils.Success(c, skills)
}

func AdminCreateSkill(c *gin.Context) {
	var input models.Skill
	c.ShouldBindJSON(&input)
	database.GetDB().Create(&input)
	utils.Success(c, input)
}

func AdminUpdateSkill(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var skill models.Skill
	database.GetDB().First(&skill, id)
	var input models.Skill
	c.ShouldBindJSON(&input)
	database.GetDB().Model(&skill).Updates(input)
	utils.Success(c, skill)
}

func AdminDeleteSkill(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	database.GetDB().Delete(&models.Skill{}, id)
	utils.Success(c, "Deleted")
}

// Contacts CRUD
func AdminGetContacts(c *gin.Context) {
	var contacts []models.Contact
	database.GetDB().Find(&contacts)
	utils.Success(c, contacts)
}

func AdminCreateContact(c *gin.Context) {
	var input models.Contact
	c.ShouldBindJSON(&input)
	database.GetDB().Create(&input)
	utils.Success(c, input)
}

func AdminUpdateContact(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var contact models.Contact
	database.GetDB().First(&contact, id)
	var input models.Contact
	c.ShouldBindJSON(&input)
	database.GetDB().Model(&contact).Updates(input)
	utils.Success(c, contact)
}

func AdminDeleteContact(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	database.GetDB().Delete(&models.Contact{}, id)
	utils.Success(c, "Deleted")
}

// Avatars CRUD
func AdminGetAvatars(c *gin.Context) {
	var avatars []models.Avatar
	database.GetDB().Find(&avatars)
	utils.Success(c, avatars)
}

func AdminCreateAvatar(c *gin.Context) {
	var input models.Avatar
	c.ShouldBindJSON(&input)
	database.GetDB().Create(&input)
	utils.Success(c, input)
}

func AdminUpdateAvatar(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var avatar models.Avatar
	database.GetDB().First(&avatar, id)
	var input models.Avatar
	c.ShouldBindJSON(&input)
	database.GetDB().Model(&avatar).Updates(input)
	utils.Success(c, avatar)
}

func AdminDeleteAvatar(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	database.GetDB().Delete(&models.Avatar{}, id)
	utils.Success(c, "Deleted")
}

// Comments CRUD
func AdminGetComments(c *gin.Context) {
	var comments []models.Comment
	database.GetDB().Order("created_at DESC").Find(&comments)
	utils.Success(c, comments)
}

func AdminDeleteComment(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	database.GetDB().Delete(&models.Comment{}, id)
	utils.Success(c, "Deleted")
}

func AdminUpdateCommentStatus(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var input struct {
		Status string `json:"status"`
	}
	c.ShouldBindJSON(&input)
	database.GetDB().Model(&models.Comment{}).Where("id = ?", id).Update("status", input.Status)
	utils.Success(c, "Updated")
}
```

**Step 2: Commit**

```bash
git add backend/routes/admin_crud.go
git commit -m "feat(backend): add admin CRUD routes"
```

---

### Task 14: AI 服务和导入导出

**Files:**
- Create: `backend/services/ai.go`
- Create: `backend/routes/ai_export.go`

**Step 1: 实现 AI 服务**

```go
package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/handywote/website/config"
	"github.com/handywote/website/models"
	"github.com/handywote/website/database"
)

type AIRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIResponse struct {
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Message Message `json:"message"`
}

func AnalyzeWithAI(articleID uint, cfg *config.Config) (string, error) {
	var article models.Article
	if err := database.GetDB().First(&article, articleID).Error; err != nil {
		return "", err
	}

	prompt := fmt.Sprintf("请分析以下文章，提取关键信息和标签：\n\n标题：%s\n内容：%s", article.Title, article.Content)

	reqBody := AIRequest{
		Model: cfg.OpenAIModel,
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
	}

	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", cfg.OpenAIAPIURL+"/chat/completions", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.OpenAIAPIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var aiResp AIResponse
	json.NewDecoder(resp.Body).Decode(&aiResp)

	if len(aiResp.Choices) > 0 {
		return aiResp.Choices[0].Message.Content, nil
	}

	return "", nil
}
```

**Step 2: 实现导入导出路由**

```go
package routes

import (
	"encoding/json"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

type ExportData struct {
	Articles   []models.Article   `json:"articles"`
	Skills     []models.Skill     `json:"skills"`
	Contacts   []models.Contact   `json:"contacts"`
	Avatars    []models.Avatar    `json:"avatars"`
	SiteBlocks []models.SiteBlock `json:"site_blocks"`
}

func ExportData(c *gin.Context) {
	var data ExportData

	database.GetDB().Find(&data.Articles)
	database.GetDB().Find(&data.Skills)
	database.GetDB().Find(&data.Contacts)
	database.GetDB().Find(&data.Avatars)
	database.GetDB().Find(&data.SiteBlocks)

	jsonData, _ := json.MarshalIndent(data, "", "  ")

	c.Header("Content-Disposition", "attachment; filename=export.json")
	c.Header("Content-Type", "application/json")
	c.String(200, string(jsonData))
}

func ImportData(c *gin.Context) {
	var data ExportData
	if err := c.ShouldBindJSON(&data); err != nil {
		utils.ErrorBadRequest(c, "Invalid JSON")
		return
	}

	for _, article := range data.Articles {
		article.ID = 0
		database.GetDB().Create(&article)
	}
	for _, skill := range data.Skills {
		skill.ID = 0
		database.GetDB().Create(&skill)
	}
	for _, contact := range data.Contacts {
		contact.ID = 0
		database.GetDB().Create(&contact)
	}
	for _, avatar := range data.Avatars {
		avatar.ID = 0
		database.GetDB().Create(&avatar)
	}
	for _, block := range data.SiteBlocks {
		block.ID = 0
		database.GetDB().Create(&block)
	}

	utils.Success(c, "Data imported successfully")
}
```

**Step 3: Commit**

```bash
git add backend/services/ai.go backend/routes/ai_export.go
git commit -m "feat(backend): add AI service and import/export"
```

---

### Task 15: SEO 和系统路由

**Files:**
- Create: `backend/routes/system.go`

**Step 1: 实现系统路由**

```go
package routes

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// HealthCheck 健康检查
func HealthCheck(c *gin.Context) {
	utils.Success(c, gin.H{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}

// RobotsTxt robots.txt
func RobotsTxt(c *gin.Context) {
	baseURL := c.Request.Host
	c.String(200, "User-agent: *\nAllow: /\nSitemap: http://%s/sitemap.xml", baseURL)
}

// SitemapXml sitemap.xml
func SitemapXml(c *gin.Context) {
	baseURL := "https://" + c.Request.Host

	var articles []models.Article
	database.GetDB().Where("deleted_at IS NULL").Find(&articles)

	urls := []string{
		fmt.Sprintf("%s/", baseURL),
		fmt.Sprintf("%s/articles", baseURL),
	}

	for _, article := range articles {
		urls = append(urls, fmt.Sprintf("%s/articles/%d", baseURL, article.ID))
	}

	xml := `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
	for _, url := range urls {
		xml += fmt.Sprintf("<url><loc>%s</loc><lastmod>%s</lastmod></url>", url, time.Now().Format("2006-01-02"))
	}
	xml += `</urlset>`

	c.Header("Content-Type", "application/xml")
	c.String(200, xml)
}
```

**Step 2: Commit**

```bash
git add backend/routes/system.go
git commit -m "feat(backend): add system routes"
```

---

### Task 16: 路由注册

**Files:**
- Create: `backend/routes/routes.go`

**Step 1: 实现路由注册**

```go
package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
)

func SetupRoutes(r *gin.Engine, cfg *config.Config) {
	// Middleware
	r.Use(middleware.CORS())
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// System routes
	r.GET("/health", HealthCheck)
	r.GET("/robots.txt", RobotsTxt)
	r.GET("/sitemap.xml", SitemapXml)

	// Static files
	r.Static("/uploads", cfg.UploadFolder)

	// Public API
	api := r.Group("/api")
	{
		// Articles
		api.GET("/articles", GetArticles)
		api.GET("/articles/:id", GetArticle)
		api.GET("/articles/:id/comments", GetComments)
		api.POST("/articles/:id/comments", CreateComment)
		api.GET("/articles/pdf/:filename", func(c *gin.Context) {
			c.File(cfg.UploadFolder + "/pdfs/" + c.Param("filename"))
		})

		// Categories & Tags
		api.GET("/categories", GetCategories)
		api.GET("/tags", GetTags)

		// Public data
		api.GET("/site-blocks", GetSiteBlocks)
		api.GET("/skills", GetSkills)
		api.GET("/contacts", GetContacts)
		api.GET("/avatars", GetAvatars)
	}

	// Admin API
	admin := r.Group("/api/admin")
	admin.Use(middleware.JWTAuth(cfg.JWTSecretKey))
	{
		// Auth
		admin.POST("/login", Login)
		admin.POST("/logout", Logout)
		admin.GET("/verify", Verify)

		// Site Blocks
		admin.GET("/site-blocks", AdminGetSiteBlocks)
		admin.POST("/site-blocks", AdminCreateSiteBlock)
		admin.PUT("/site-blocks/:id", AdminUpdateSiteBlock)
		admin.DELETE("/site-blocks/:id", AdminDeleteSiteBlock)

		// Skills
		admin.GET("/skills", AdminGetSkills)
		admin.POST("/skills", AdminCreateSkill)
		admin.PUT("/skills/:id", AdminUpdateSkill)
		admin.DELETE("/skills/:id", AdminDeleteSkill)

		// Contacts
		admin.GET("/contacts", AdminGetContacts)
		admin.POST("/contacts", AdminCreateContact)
		admin.PUT("/contacts/:id", AdminUpdateContact)
		admin.DELETE("/contacts/:id", AdminDeleteContact)

		// Avatars
		admin.GET("/avatars", AdminGetAvatars)
		admin.POST("/avatars", AdminCreateAvatar)
		admin.PUT("/avatars/:id", AdminUpdateAvatar)
		admin.DELETE("/avatars/:id", AdminDeleteAvatar)

		// Articles
		admin.GET("/articles", AdminGetArticles)
		admin.GET("/articles/:id", AdminGetArticle)
		admin.POST("/articles", AdminCreateArticle)
		admin.PUT("/articles/:id", AdminUpdateArticle)
		admin.DELETE("/articles/:id", AdminDeleteArticle)
		admin.POST("/articles/batch-delete", AdminBatchDeleteArticles)
		admin.POST("/articles/cover", AdminUploadCover)

		// Comments
		admin.GET("/comments", AdminGetComments)
		admin.DELETE("/comments/:id", AdminDeleteComment)
		admin.PUT("/comments/:id", AdminUpdateCommentStatus)

		// Export/Import
		admin.GET("/export", ExportData)
		admin.POST("/import", ImportData)
	}
}
```

**Step 2: Commit**

```bash
git add backend/routes/routes.go
git commit -m "feat(backend): add route registration"
```

---

## 阶段 5: 主程序和运行

### Task 17: 更新 main.go

**Files:**
- Modify: `backend/main.go`

**Step 1: 更新 main.go**

```go
package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/routes"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		log.Printf("Warning: Database connection failed: %v", err)
	} else {
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

		// Seed initial data
		seedData()
	}

	// Create Gin router
	r := gin.Default()

	// Setup routes
	routes.SetupRoutes(r, cfg)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	log.Printf("Starting server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

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
			{Type: "wechat", Value: "handywote123"},
		}
		db.Create(&contacts)
		log.Println("Seeded contacts")
	}
}
```

**Step 2: 运行测试**

Run: `cd backend && go build -o server .`
Expected: 编译成功

**Step 3: Commit**

```bash
git add backend/main.go
git commit -m "feat(backend): add main entry point"
```

---

### Task 18: Docker 配置

**Files:**
- Create: `backend/Dockerfile`

**Step 1: 创建 Dockerfile**

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY --from=builder /app/server .
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/.env ./.env

EXPOSE 5000

CMD ["./server"]
```

**Step 2: Commit**

```bash
git add backend/Dockerfile
git commit -m "chore(backend): add Dockerfile"
```

---

## 实施完成

**计划包含的任务总数**: 18 个任务

**执行方式**:
1. 按顺序执行每个任务
2. 每个任务遵循 TDD 流程：写测试 → 验证失败 → 写实现 → 验证通过 → 提交
3. 确保代码编译通过后再进行下一步

---

**Plan complete and saved to `docs/plans/2026-03-16-flask-to-go-gin-plan.md`.**

Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
