package migrations

import (
	"fmt"
	"log"
	"strings"

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

	// 新增：avatar.cropped_info 类型转换
	if err := migrateAvatarCroppedInfo(db); err != nil {
		log.Printf("[MIGRATION] Failed to migrate avatar.cropped_info: %v", err)
		// 不返回错误，允许服务继续启动
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

// getColumnType 获取列的 PostgreSQL 数据类型
func getColumnType(db *gorm.DB, tableName, columnName string) (string, error) {
	var colType string
	err := db.Raw(`
		SELECT data_type FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
	`, tableName, columnName).Scan(&colType).Error
	return colType, err
}

func shouldConvertAvatarCroppedInfoToJSONB(colType string) bool {
	switch strings.ToLower(strings.TrimSpace(colType)) {
	case "text", "character varying":
		return true
	default:
		return false
	}
}

// migrateAvatarCroppedInfo 将 avatar.cropped_info 对齐为 jsonb（与 GORM 模型一致）
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

	// 已与模型一致时跳过
	if colType == "jsonb" {
		log.Printf("[MIGRATION] avatar.cropped_info is already type %s, skipping", colType)
		return nil
	}

	// 仅将旧版 text/varchar 升级到 jsonb，避免与模型冲突反复变更
	if shouldConvertAvatarCroppedInfoToJSONB(colType) {
		log.Printf("[MIGRATION] Converting avatar.cropped_info from %s to jsonb", colType)
		return db.Exec("ALTER TABLE avatar ALTER COLUMN cropped_info TYPE jsonb USING cropped_info::jsonb").Error
	}

	log.Printf("[MIGRATION] avatar.cropped_info is type %s, skipping", colType)
	return nil
}

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
	sql := fmt.Sprintf(`ALTER TABLE "%s" ADD COLUMN "%s" %s`, m.TableName, m.ColumnName, m.ColumnType)
	if m.DefaultVal != "" {
		sql += fmt.Sprintf(` DEFAULT %s`, m.DefaultVal)
	}
	return db.Exec(sql).Error
}
