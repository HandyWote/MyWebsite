package services

import (
	"bytes"
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func profileTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.SiteBlock{}, &models.Avatar{}, &models.RevalidationOutbox{}, &models.MediaDeleteTask{}))
	return db
}

func TestSiteBlockServiceCentralizesPublicAndAdminPayloads(t *testing.T) {
	db := profileTestDB(t)
	service := NewSiteBlockService(repositories.NewSiteBlockRepository(db))
	ctx := context.Background()
	updated, err := service.UpsertMany(ctx, []SiteBlockInput{{Name: "home", Content: map[string]interface{}{"title": "Hello", "id": "ignored"}}})
	require.NoError(t, err)
	require.Len(t, updated, 1)

	admin, err := service.Payloads(ctx, false)
	require.NoError(t, err)
	assert.NotContains(t, admin[0], "title")
	public, err := service.Payloads(ctx, true)
	require.NoError(t, err)
	assert.Equal(t, "Hello", public[0]["title"])
	assert.Equal(t, updated[0].ID, public[0]["id"], "content cannot overwrite reserved fields")

	var count int64
	require.NoError(t, db.Model(&models.RevalidationOutbox{}).Count(&count).Error)
	assert.Equal(t, int64(1), count)
}

func TestAvatarServiceUsesStorageKeysAndMaintainsSingleCurrentAvatar(t *testing.T) {
	db := profileTestDB(t)
	driver := storage.NewLocalStorage(t.TempDir(), "https://media.example")
	media := NewMediaStorageService(driver, repositories.NewMediaDeleteRepository(db), 1024, []string{"png"})
	service := NewAvatarService(repositories.NewAvatarRepository(db), media)
	ctx := context.Background()
	png := []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n', 0, 0, 0, 0}

	first, err := service.Upload(ctx, "first.png", bytes.NewReader(png), int64(len(png)))
	require.NoError(t, err)
	second, err := service.Upload(ctx, "second.png", bytes.NewReader(png), int64(len(png)))
	require.NoError(t, err)
	assert.Contains(t, first.Filename, "avatars/")
	assert.Equal(t, "https://media.example/"+second.Filename, second.URL)

	avatars, err := service.List(ctx)
	require.NoError(t, err)
	require.Len(t, avatars, 2)
	currentCount := 0
	for _, avatar := range avatars { if avatar.IsCurrent { currentCount++ } }
	assert.Equal(t, 1, currentCount)
	current, err := service.Current(ctx)
	require.NoError(t, err)
	assert.Equal(t, second.ID, current.ID)

	require.NoError(t, service.SetCurrent(ctx, first.ID))
	current, err = service.Current(ctx)
	require.NoError(t, err)
	assert.Equal(t, first.ID, current.ID)
}
