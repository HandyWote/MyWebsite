package main

import (
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestRunDatabaseMigrationsFailsWhenAutoMigrateFails(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	err = runDatabaseMigrations(db)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "auto migrate schema")
}

// TestRunDatabaseMigrationsCreatesDrawingTables 工单 #9:runDatabaseMigrations
// 是生产启动唯一的建表路径,画布两表(drawing_versions/drawing_submissions)
// 必须在模型列表里;缺了会导致部署后画布接口 500。
func TestRunDatabaseMigrationsCreatesDrawingTables(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, runDatabaseMigrations(db))

	assert.True(t, db.Migrator().HasTable(&models.DrawingVersion{}), "drawing_versions 必须在生产迁移中创建")
	assert.True(t, db.Migrator().HasTable(&models.DrawingSubmission{}), "drawing_submissions 必须在生产迁移中创建")
}

func TestRunDatabaseMigrationsRejectsNilDatabase(t *testing.T) {
	assert.Error(t, runDatabaseMigrations(nil))
}
