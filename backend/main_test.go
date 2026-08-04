package main

import (
	"testing"

	"github.com/glebarez/sqlite"
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

func TestRunDatabaseMigrationsRejectsNilDatabase(t *testing.T) {
	assert.Error(t, runDatabaseMigrations(nil))
}
