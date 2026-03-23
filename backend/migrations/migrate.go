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
