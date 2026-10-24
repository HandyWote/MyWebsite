package services

import (
	"bytes"
	"context"
	"encoding/json"
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

func TestEncodeSiteBlockContentReturnsContextualMarshalError(t *testing.T) {
	_, err := encodeSiteBlockContent(make(chan int))

	require.Error(t, err)
	var unsupportedType *json.UnsupportedTypeError
	assert.ErrorAs(t, err, &unsupportedType)
	assert.Contains(t, err.Error(), "encode site block content")
}

func TestAvatarServiceUploadReplacesSingleAvatarAndKeepsReplacedMedia(t *testing.T) {
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
	require.Len(t, avatars, 1, "上传即替换：任何时候只保留一张头像")
	assert.Equal(t, second.ID, avatars[0].ID)
	assert.True(t, avatars[0].IsCurrent)

	current, err := service.Current(ctx)
	require.NoError(t, err)
	assert.Equal(t, second.ID, current.ID)

	// 旧文件故意保留：前台头像 URL 会被 Next 的 profile 缓存命中，revalidate 之前
	// 页面里仍是旧 URL；删文件会让那段时间变成坏图。旧文件由媒体孤儿清理统一回收。
	_, err = driver.Head(ctx, first.Filename)
	require.NoError(t, err, "被替换的旧头像媒体仍需可访问（防止缓存页面出现坏图）")
	_, err = driver.Head(ctx, second.Filename)
	require.NoError(t, err, "新头像媒体必须保留")
}

func TestAvatarServiceDeleteRemovesRecordButKeepsMediaFile(t *testing.T) {
	db := profileTestDB(t)
	driver := storage.NewLocalStorage(t.TempDir(), "https://media.example")
	media := NewMediaStorageService(driver, repositories.NewMediaDeleteRepository(db), 1024, []string{"png"})
	service := NewAvatarService(repositories.NewAvatarRepository(db), media)
	ctx := context.Background()
	png := []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n', 0, 0, 0, 0}

	avatar, err := service.Upload(ctx, "only.png", bytes.NewReader(png), int64(len(png)))
	require.NoError(t, err)

	require.NoError(t, service.Delete(ctx, avatar.ID))

	_, err = service.Current(ctx)
	assert.ErrorIs(t, err, ErrAvatarNotFound, "记录删除后不再有当前头像")

	// 和上传替换同一条理由：profile 缓存窗口期内页面里仍是旧 URL，删文件就是坏图。
	_, err = driver.Head(ctx, avatar.Filename)
	require.NoError(t, err, "删除头像记录不删媒体文件，孤立对象交给媒体孤儿清理")

	assert.ErrorIs(t, service.Delete(ctx, avatar.ID), ErrAvatarNotFound, "重复删除返回 not found")
}
