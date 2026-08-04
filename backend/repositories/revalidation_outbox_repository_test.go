package repositories

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newOutboxRepositoryTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.RevalidationOutbox{}))
	return db
}

func TestRevalidationOutboxClaimDueLeasesEventAndRejectsStaleOwner(t *testing.T) {
	db := newOutboxRepositoryTestDB(t)
	repository := NewRevalidationOutboxRepository(db)
	now := time.Now().UTC()
	event := models.RevalidationOutbox{
		Entity: "article", Action: "update", IDsJSON: "[1]", NextAttemptAt: now.Add(-time.Minute),
	}
	require.NoError(t, repository.Create(context.Background(), &event))

	first, err := repository.ClaimDue(context.Background(), now, 1, time.Minute)
	require.NoError(t, err)
	require.Len(t, first, 1)
	second, err := repository.ClaimDue(context.Background(), now, 1, time.Minute)
	require.NoError(t, err)
	assert.Empty(t, second)

	reclaimed, err := repository.ClaimDue(context.Background(), now.Add(2*time.Minute), 1, time.Minute)
	require.NoError(t, err)
	require.Len(t, reclaimed, 1)
	assert.NotEqual(t, first[0].LeaseToken, reclaimed[0].LeaseToken)
	assert.ErrorIs(t, repository.MarkProcessed(context.Background(), event.ID, first[0].LeaseToken, now), ErrOutboxLeaseLost)
	require.NoError(t, repository.MarkProcessed(context.Background(), event.ID, reclaimed[0].LeaseToken, now.Add(2*time.Minute)))
}

func TestRevalidationOutboxConcurrentClaimsDoNotOverlap(t *testing.T) {
	db := newOutboxRepositoryTestDB(t)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	repository := NewRevalidationOutboxRepository(db)
	now := time.Now().UTC()
	event := models.RevalidationOutbox{Entity: "article", Action: "update", IDsJSON: "[1]", NextAttemptAt: now.Add(-time.Minute)}
	require.NoError(t, repository.Create(context.Background(), &event))

	var wg sync.WaitGroup
	wg.Add(2)
	results := make(chan []models.RevalidationOutbox, 2)
	errors := make(chan error, 2)
	for range 2 {
		go func() {
			defer wg.Done()
			claimed, err := repository.ClaimDue(context.Background(), now, 1, time.Minute)
			results <- claimed
			errors <- err
		}()
	}
	wg.Wait()
	close(results)
	close(errors)

	claimedCount := 0
	for err := range errors {
		require.NoError(t, err)
	}
	for claimed := range results {
		claimedCount += len(claimed)
	}
	assert.Equal(t, 1, claimedCount)
}
