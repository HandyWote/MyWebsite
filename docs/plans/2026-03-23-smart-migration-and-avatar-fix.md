# Smart Migration & Avatar Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复两个生产问题：(1) 头像文件访问返回401 (2) site_block表缺少created_at列导致的500错误

**Architecture:**
- 创建 `migrations` 包实现智能迁移，检测数据库列是否存在，只在缺失时添加
- 将头像文件路由从 admin 组移出，改为公共路由（技术债最低的方案）

**Tech Stack:** Go, GORM, PostgreSQL

---

## Task 1: 创建智能迁移系统

**Files:**
- Create: `backend/migrations/migrate.go`
- Modify: `backend/main.go:23-32`

### Step 1: 创建 migrations 包目录和文件

Create `backend/migrations/migrate.go`:

```go
package migrations

import (
	"log"

	"gorm.io/gorm"
)

// ColumnMigration 定义需要检查的列
type ColumnMigration struct {
	TableName  string
	ColumnName string
	ColumnType string // PostgreSQL 类型
	DefaultVal string // DEFAULT 值（可选）
}

// GetRequiredMigrations 返回所有需要检查的列迁移
func GetRequiredMigrations() []ColumnMigration {
	return []ColumnMigration{
		{
			TableName:  "site_block",
			ColumnName: "created_at",
			ColumnType: "timestamp without time zone",
			DefaultVal: "CURRENT_TIMESTAMP",
		},
		{
			TableName:  "ai_settings",
			ColumnName: "created_at",
			ColumnType: "timestamp without time zone",
			DefaultVal: "CURRENT_TIMESTAMP",
		},
	}
}

// RunMigrations 检查并执行缺失的列迁移
func RunMigrations(db *gorm.DB) error {
	migrations := GetRequiredMigrations()

	for _, m := range migrations {
		exists, err := columnExists(db, m.TableName, m.ColumnName)
		if err != nil {
			log.Printf("[MIGRATION] Error checking column %s.%s: %v", m.TableName, m.ColumnName, err)
			continue
		}

		if !exists {
			log.Printf("[MIGRATION] Adding column %s.%s", m.TableName, m.ColumnName)
			if err := addColumn(db, m); err != nil {
				log.Printf("[MIGRATION] Failed to add column %s.%s: %v", m.TableName, m.ColumnName, err)
				return err
			}
			log.Printf("[MIGRATION] Successfully added column %s.%s", m.TableName, m.ColumnName)
		} else {
			log.Printf("[MIGRATION] Column %s.%s already exists, skipping", m.TableName, m.ColumnName)
		}
	}

	return nil
}

// columnExists 检查列是否存在
func columnExists(db *gorm.DB, tableName, columnName string) (bool, error) {
	var count int64
	err := db.Raw(`
		SELECT COUNT(*) FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
	`, tableName, columnName).Count(&count).Error
	return count > 0, err
}

// addColumn 添加缺失的列
func addColumn(db *gorm.DB, m ColumnMigration) error {
	sql := "ALTER TABLE " + m.TableName + " ADD COLUMN " + m.ColumnName + " " + m.ColumnType
	if m.DefaultVal != "" {
		sql += " DEFAULT " + m.DefaultVal
	}
	return db.Exec(sql).Error
}
```

### Step 2: 修改 main.go 调用迁移

Modify `backend/main.go:23-32`:

```go
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
```

### Step 3: 测试迁移功能

Run:
```bash
cd backend && go build ./...
```
Expected: 编译成功，无错误

### Step 4: 验证迁移逻辑

Run:
```bash
cd backend && go run -exec "echo 'Migration logic verified'" .
```
Expected: 显示 "[MIGRATION] Column site_block.created_at already exists, skipping" 或 "Adding column..."

---

## Task 2: 修复头像文件401问题

**Files:**
- Modify: `backend/routes/routes.go:73`

### Step 1: 分析当前路由配置

查看 `backend/routes/routes.go` 第 45-73 行，确认：
- 第 47 行: `api.GET("/avatars/file/:filename", GetAvatarFile)` - 公共路由
- 第 73 行: `admin.GET("/avatars/file/:filename", GetAvatarFile)` - admin路由（JWT保护）

### Step 2: 移除重复的admin路由

Modify `backend/routes/routes.go:73`:
- 删除: `admin.GET("/avatars/file/:filename", GetAvatarFile)` （第73行）

**原因:** 该路由在第47行已经以公共路由方式注册，无需在admin组重复注册。删除后，头像文件请求将使用公共路由，不再被JWT中间件拦截。

### Step 3: 验证路由配置

Run:
```bash
cd backend && go build ./...
```
Expected: 编译成功

---

## Task 3: 验证完整修复

### Step 1: 重启后端服务

Run:
```bash
cd backend && go run app.go
```
Expected: 日志显示:
- "[MIGRATION] Column site_block.created_at already exists, skipping"
- "Database migration completed"
- "Starting server on port 5000"

### Step 2: 测试头像文件访问

浏览器访问: `http://localhost:3131/api/avatars/file/头像缩略.webp`
Expected: 头像图片正常显示，无401错误

### Step 3: 测试 site-blocks API

Run:
```bash
curl -X PUT http://localhost:5000/api/admin/site-blocks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"blocks":[{"name":"sidebar","content":{"test":true}}]}'
```
Expected: 200 OK，无500错误

---

## 总结

| Task | 修复内容 | 风险 |
|------|----------|------|
| Task 1 | 智能迁移系统 | 低 |
| Task 2 | 移除重复的admin头像路由 | 低 |

**推荐执行顺序:** Task 1 → Task 2 → Task 3
