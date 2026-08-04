package services

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
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

func mediaMigrationTestService(t *testing.T) (*gorm.DB, string, *storage.LocalStorage, *MediaMigrationService) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.Article{}, &models.Avatar{}, &models.RevalidationOutbox{}))
	source := t.TempDir()
	target := storage.NewLocalStorage(t.TempDir(), "https://media.example")
	service := NewMediaMigrationService(source, target, repositories.NewArticleRepository(db), repositories.NewAvatarRepository(db))
	return db, source, target, service
}

type failingReadCloser struct {
	readErr  error
	closeErr error
}

func (source *failingReadCloser) Read(_ []byte) (int, error) { return 0, source.readErr }
func (source *failingReadCloser) Close() error               { return source.closeErr }

func TestSHA256AndClosePreservesReadAndCloseErrors(t *testing.T) {
	readErr := errors.New("read failed")
	closeErr := errors.New("close failed")

	_, err := sha256AndClose("source.bin", &failingReadCloser{readErr: readErr, closeErr: closeErr})

	require.Error(t, err)
	assert.ErrorIs(t, err, readErr)
	assert.ErrorIs(t, err, closeErr)
	assert.Contains(t, err.Error(), "hash migration source")
	assert.Contains(t, err.Error(), "close migration source")
}

func TestFileSHA256WrapsOpenFailure(t *testing.T) {
	_, err := fileSHA256(filepath.Join(t.TempDir(), "missing.bin"))

	require.Error(t, err)
	assert.ErrorIs(t, err, os.ErrNotExist)
	assert.Contains(t, err.Error(), "open migration source")
}

func TestMediaMigrationDryRunApplySkipVerifyAndRepeat(t *testing.T) {
	db, source, target, service := mediaMigrationTestService(t)
	content := []byte("existing image bytes")
	require.NoError(t, os.WriteFile(filepath.Join(source, "cover.webp"), content, 0o644))
	article := models.Article{Title: "article", Content: "body", Cover: "cover.webp"}
	require.NoError(t, db.Create(&article).Error)

	dryRun, err := service.Run(context.Background(), MediaMigrationDryRun)
	require.NoError(t, err)
	require.Len(t, dryRun.Items, 1)
	assert.Equal(t, "would-upload", dryRun.Items[0].Status)
	_, err = target.Head(context.Background(), "articles/covers/cover.webp")
	assert.Error(t, err)

	applied, err := service.Run(context.Background(), MediaMigrationApply)
	require.NoError(t, err)
	assert.Equal(t, 1, applied.Uploaded)
	require.NoError(t, db.First(&article, article.ID).Error)
	assert.Equal(t, "articles/covers/cover.webp", article.Cover)
	var outboxCount int64
	require.NoError(t, db.Model(&models.RevalidationOutbox{}).Count(&outboxCount).Error)
	assert.Equal(t, int64(1), outboxCount)

	repeated, err := service.Run(context.Background(), MediaMigrationApply)
	require.NoError(t, err)
	assert.Zero(t, repeated.Uploaded)
	assert.Equal(t, 1, repeated.Skipped)
	require.NoError(t, db.Model(&models.RevalidationOutbox{}).Count(&outboxCount).Error)
	assert.Equal(t, int64(1), outboxCount, "repeat must not create duplicate updates")

	verified, err := service.Run(context.Background(), MediaMigrationVerify)
	require.NoError(t, err)
	assert.Equal(t, 1, verified.Validated)
	assert.Equal(t, "https://media.example/articles/covers/cover.webp", target.PublicURL(article.Cover))
}

func TestMediaMigrationStopsOnExistingConflictWithoutDatabaseUpdate(t *testing.T) {
	db, source, target, service := mediaMigrationTestService(t)
	require.NoError(t, os.WriteFile(filepath.Join(source, "cover.webp"), []byte("source"), 0o644))
	article := models.Article{Title: "article", Content: "body", Cover: "cover.webp"}
	require.NoError(t, db.Create(&article).Error)
	require.NoError(t, target.Save(context.Background(), "articles/covers/cover.webp", bytes.NewReader([]byte("different size")), int64(len("different size")), "image/webp", nil))

	result, err := service.Run(context.Background(), MediaMigrationApply)
	require.Error(t, err)
	require.Len(t, result.Items, 1)
	assert.Equal(t, "conflict", result.Items[0].Status)
	require.NoError(t, db.First(&article, article.ID).Error)
	assert.Equal(t, "cover.webp", article.Cover)
	var outboxCount int64
	require.NoError(t, db.Model(&models.RevalidationOutbox{}).Count(&outboxCount).Error)
	assert.Zero(t, outboxCount)
}

type recordingMigrationStorage struct {
	*storage.LocalStorage
	metadata map[string]string
}

func (s *recordingMigrationStorage) Save(ctx context.Context, key string, body io.ReadSeeker, size int64, contentType string, metadata map[string]string) error {
	s.metadata = make(map[string]string, len(metadata))
	for name, value := range metadata {
		s.metadata[name] = value
	}
	return s.LocalStorage.Save(ctx, key, body, size, contentType, metadata)
}

type checksumlessMigrationStorage struct {
	*storage.LocalStorage
}

func (s *checksumlessMigrationStorage) Head(ctx context.Context, key string) (storage.ObjectInfo, error) {
	info, err := s.LocalStorage.Head(ctx, key)
	info.Metadata = nil
	return info, err
}

func TestMediaMigrationWritesSHA256MetadataForNewObjects(t *testing.T) {
	db, source, target, _ := mediaMigrationTestService(t)
	content := []byte("new image bytes")
	require.NoError(t, os.WriteFile(filepath.Join(source, "cover.webp"), content, 0o644))
	article := models.Article{Title: "article", Content: "body", Cover: "cover.webp"}
	require.NoError(t, db.Create(&article).Error)
	recorder := &recordingMigrationStorage{LocalStorage: target}
	service := NewMediaMigrationService(source, recorder, repositories.NewArticleRepository(db), repositories.NewAvatarRepository(db))

	result, err := service.Run(context.Background(), MediaMigrationApply)
	require.NoError(t, err)
	assert.Equal(t, 1, result.Uploaded)
	assert.Len(t, recorder.metadata[storage.SHA256MetadataKey], 64)
	assert.Equal(t, result.Items[0].Checksum, recorder.metadata[storage.SHA256MetadataKey])
}

func TestMediaMigrationConflictsOnSameSizeAndMIMEWithDifferentChecksum(t *testing.T) {
	db, source, target, service := mediaMigrationTestService(t)
	require.NoError(t, os.WriteFile(filepath.Join(source, "cover.webp"), []byte("source"), 0o644))
	article := models.Article{Title: "article", Content: "body", Cover: "cover.webp"}
	require.NoError(t, db.Create(&article).Error)
	require.NoError(t, target.Save(context.Background(), "articles/covers/cover.webp", bytes.NewReader([]byte("target")), 6, "image/webp", nil))

	result, err := service.Run(context.Background(), MediaMigrationApply)
	require.Error(t, err)
	require.Len(t, result.Items, 1)
	assert.Equal(t, "conflict", result.Items[0].Status)
	require.NoError(t, db.First(&article, article.ID).Error)
	assert.Equal(t, "cover.webp", article.Cover)
}

func TestMediaMigrationKeepsChecksumlessExistingObjectCompatibility(t *testing.T) {
	db, source, target, _ := mediaMigrationTestService(t)
	require.NoError(t, os.WriteFile(filepath.Join(source, "cover.webp"), []byte("source"), 0o644))
	article := models.Article{Title: "article", Content: "body", Cover: "cover.webp"}
	require.NoError(t, db.Create(&article).Error)
	require.NoError(t, target.Save(context.Background(), "articles/covers/cover.webp", bytes.NewReader([]byte("target")), 6, "image/webp", nil))
	legacyStorage := &checksumlessMigrationStorage{LocalStorage: target}
	service := NewMediaMigrationService(source, legacyStorage, repositories.NewArticleRepository(db), repositories.NewAvatarRepository(db))

	result, err := service.Run(context.Background(), MediaMigrationApply)
	require.NoError(t, err)
	assert.Equal(t, 1, result.Skipped)
	require.NoError(t, db.First(&article, article.ID).Error)
	assert.Equal(t, "articles/covers/cover.webp", article.Cover)
}
