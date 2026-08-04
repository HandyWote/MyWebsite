package repositories

import (
	"context"
	"errors"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func repositoryTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.Article{}, &models.Comment{}, &models.RevalidationOutbox{}))
	return db
}

func TestArticleRepositoryQueryNotFoundAndBatch(t *testing.T) {
	db := repositoryTestDB(t)
	repository := NewArticleRepository(db)
	ctx := context.Background()
	for _, article := range []models.Article{
		{Title: "Go Service", Category: "tech", Tags: "go,api", Content: "repository"},
		{Title: "Other", Category: "notes", Tags: "life", Content: "text"},
	} {
		require.NoError(t, repository.Create(ctx, &article))
	}
	articles, total, err := repository.ListPublic(ctx, ArticleFilter{Search: "SERVICE", Category: "tech", Tag: "GO", Page: 1, PageSize: 10})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	require.Len(t, articles, 1)
	assert.Empty(t, articles[0].Content)

	_, err = repository.FindByID(ctx, 999)
	assert.True(t, errors.Is(err, gorm.ErrRecordNotFound))
	require.NoError(t, repository.BatchDelete(ctx, []uint{articles[0].ID}))
	_, err = repository.FindByID(ctx, articles[0].ID)
	assert.True(t, errors.Is(err, gorm.ErrRecordNotFound))
}

func TestArticleRepositoryTransactionRollsBackAllRepositories(t *testing.T) {
	db := repositoryTestDB(t)
	repository := NewArticleRepository(db)
	expected := errors.New("stop")
	err := repository.Transaction(context.Background(), func(uow *UnitOfWork) error {
		article := models.Article{Title: "rollback", Content: "body"}
		require.NoError(t, uow.Articles.Create(context.Background(), &article))
		event := models.RevalidationOutbox{Entity: "article", Action: "create", IDsJSON: "[]"}
		require.NoError(t, uow.Outbox.Create(context.Background(), &event))
		return expected
	})
	assert.ErrorIs(t, err, expected)

	count, err := repository.Count(context.Background())
	require.NoError(t, err)
	assert.Zero(t, count)
	var outboxCount int64
	require.NoError(t, db.Model(&models.RevalidationOutbox{}).Count(&outboxCount).Error)
	assert.Zero(t, outboxCount)
}
