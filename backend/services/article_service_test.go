package services

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func articleServiceTestDB(t *testing.T, withOutbox bool) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.Article{}))
	if withOutbox {
		require.NoError(t, db.AutoMigrate(&models.RevalidationOutbox{}))
	}
	return db
}

func stringPointer(value string) *string { return &value }

func TestArticleServiceExplicitlyClearsNullableTextFieldsAndWritesOutbox(t *testing.T) {
	db := articleServiceTestDB(t, true)
	service := NewArticleService(repositories.NewArticleRepository(db))
	ctx := context.Background()
	article, err := service.Create(ctx, ArticleWriteInput{
		Title: stringPointer("title"), Content: stringPointer("body"), Summary: stringPointer("summary"),
		Cover: stringPointer("articles/covers/old.webp"), PDFFilename: stringPointer("articles/pdfs/old.pdf"),
	})
	require.NoError(t, err)

	empty := ""
	updated, err := service.Update(ctx, article.ID, ArticleWriteInput{Summary: &empty, Cover: &empty, PDFFilename: &empty})
	require.NoError(t, err)
	assert.Empty(t, updated.Summary)
	assert.Empty(t, updated.Cover)
	assert.Empty(t, updated.PDFFilename)
	assert.Equal(t, "title", updated.Title)

	var events []models.RevalidationOutbox
	require.NoError(t, db.Order("id ASC").Find(&events).Error)
	require.Len(t, events, 2)
	assert.Equal(t, "create", events[0].Action)
	assert.Equal(t, "update", events[1].Action)
}

func TestArticleServiceRollsBackWhenOutboxCannotBeWritten(t *testing.T) {
	db := articleServiceTestDB(t, false)
	service := NewArticleService(repositories.NewArticleRepository(db))
	_, err := service.Create(context.Background(), ArticleWriteInput{Title: stringPointer("title"), Content: stringPointer("body")})
	require.Error(t, err)
	var count int64
	require.NoError(t, db.Model(&models.Article{}).Count(&count).Error)
	assert.Zero(t, count)
}

func TestArticleServiceMarkdownImportAndBatchDeleteAreOrchestrated(t *testing.T) {
	db := articleServiceTestDB(t, true)
	service := NewArticleService(repositories.NewArticleRepository(db))
	ctx := context.Background()
	articles, err := service.ImportMarkdown(ctx, []MarkdownDocument{
		{Filename: "fallback.md", Content: "# Parsed title\nbody"},
		{Filename: "second.markdown", Content: "body"},
	})
	require.NoError(t, err)
	require.Len(t, articles, 2)
	assert.Equal(t, "Parsed title", articles[0].Title)
	assert.Equal(t, "second", articles[1].Title)
	require.NoError(t, service.BatchDelete(ctx, []uint{articles[0].ID, articles[1].ID}))
	remaining, err := service.All(ctx)
	require.NoError(t, err)
	assert.Empty(t, remaining)
}
