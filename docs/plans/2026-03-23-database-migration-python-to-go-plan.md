# Database Migration Python to Go Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 扩展启动时迁移功能，自动处理 Python 到 Go 数据库差异

**Architecture:** 扩展现有 `migrate.go`，在服务启动时自动检测并执行迁移

**Tech Stack:** Go, GORM, PostgreSQL

---

## 前置检查

- [x] 设计文档已创建: `docs/plans/2026-03-23-database-migration-python-to-go-design.md`
- [x] 现有迁移逻辑已分析: `backend/migrations/migrate.go`

---

## Task 1: 扩展 AddColumnIfNotExists 函数

**Files:**
- Modify: `backend/migrations/migrate.go:71-78`

**Step 1: 添加 IF NOT EXISTS 检查**

将现有的 `addColumn` 函数修改为带条件检查的版本：

```go
// addColumn 添加缺失的列（幂等版本）
func addColumn(db *gorm.DB, m ColumnMigration) error {
    // 先检查列是否存在
    exists, err := columnExists(db, m.TableName, m.ColumnName)
    if err != nil {
        return err
    }
    if exists {
        log.Printf("[MIGRATION] Column %s.%s already exists, skipping", m.TableName, m.ColumnName)
        return nil
    }

    // 构建并执行 ADD COLUMN 语句
    sql := "ALTER TABLE " + m.TableName + " ADD COLUMN " + m.ColumnName + " " + m.ColumnType
    if m.DefaultVal != "" {
        sql += " DEFAULT " + m.DefaultVal
    }
    return db.Exec(sql).Error
}
```

**Step 2: 验证编译**

Run: `cd /home/handy/MyWebsite/backend && go build -o /dev/null .`
Expected: 无错误

---

## Task 2: 添加 avatar.cropped_info 类型转换

**Files:**
- Modify: `backend/migrations/migrate.go`

**Step 1: 添加列类型检测函数**

```go
// getColumnType 获取列的 PostgreSQL 数据类型
func getColumnType(db *gorm.DB, tableName, columnName string) (string, error) {
    var colType string
    err := db.Raw(`
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
    `, tableName, columnName).Scan(&colType).Error
    return colType, err
}
```

**Step 2: 添加 cropped_info 转换函数**

```go
// migrateAvatarCroppedInfo 将 avatar.cropped_info 从 jsonb 转换为 text
func migrateAvatarCroppedInfo(db *gorm.DB) error {
    // 检查列是否存在
    exists, err := columnExists(db, "avatar", "cropped_info")
    if err != nil {
        return err
    }
    if !exists {
        log.Printf("[MIGRATION] Column avatar.cropped_info does not exist, skipping")
        return nil
    }

    // 检查当前类型
    colType, err := getColumnType(db, "avatar", "cropped_info")
    if err != nil {
        return err
    }

    // 如果已经是 text/varchar，跳过
    if colType == "character varying" || colType == "text" {
        log.Printf("[MIGRATION] avatar.cropped_info is already type %s, skipping", colType)
        return nil
    }

    // 如果是 jsonb，进行转换
    if colType == "jsonb" {
        log.Printf("[MIGRATION] Converting avatar.cropped_info from jsonb to text")
        // jsonb 在 PostgreSQL 中可以直接转为 text，不需要 USING 表达式
        return db.Exec("ALTER TABLE avatar ALTER COLUMN cropped_info TYPE TEXT").Error
    }

    log.Printf("[MIGRATION] avatar.cropped_info is type %s, skipping", colType)
    return nil
}
```

**Step 3: 在 RunMigrations 中调用**

```go
// RunMigrations 检查并执行所有迁移
func RunMigrations(db *gorm.DB) error {
    // ... 现有的列迁移 ...

    // 新增：avatar.cropped_info 类型转换
    if err := migrateAvatarCroppedInfo(db); err != nil {
        log.Printf("[MIGRATION] Failed to migrate avatar.cropped_info: %v", err)
        // 不返回错误，允许服务继续启动
    }

    return nil
}
```

**Step 4: 验证编译**

Run: `cd /home/handy/MyWebsite/backend && go build -o /dev/null .`
Expected: 无错误

---

## Task 3: 验证完整迁移流程

**Files:**
- Review: `backend/main.go`

**Step 1: 确认迁移调用顺序**

检查 `main.go` 中迁移调用位置是否正确：

```go
// Auto migrate - 创建新表
database.GetDB().AutoMigrate(...)

// Run migrations - 修复旧表结构
migrations.RunMigrations(database.GetDB())
```

**Step 2: 本地测试（需要本地 PostgreSQL）**

如果本地有测试数据库：

```bash
# 1. 启动本地数据库
docker-compose up -d

# 2. 运行后端触发迁移
cd backend && go run main.go

# 3. 检查日志输出
# 应该看到类似：
# [MIGRATION] Column site_block.created_at already exists, skipping
# [MIGRATION] Column ai_settings.created_at already exists, skipping
# [MIGRATION] avatar.cropped_info is already type text, skipping
```

---

## 注意事项

1. **错误处理策略**：迁移失败只打印日志，不阻止服务启动
2. **幂等性**：所有迁移步骤可重复执行而不改变结果
3. **向后兼容**：新数据库（Go 版本创建）不会被影响
