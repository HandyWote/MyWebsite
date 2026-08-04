package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func outboxTestRepository(t *testing.T) (*gorm.DB, *repositories.RevalidationOutboxRepository) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.RevalidationOutbox{}))
	return db, repositories.NewRevalidationOutboxRepository(db)
}

func createDueEvent(t *testing.T, repository *repositories.RevalidationOutboxRepository) models.RevalidationOutbox {
	t.Helper()
	event, err := NewOutboxRecord(RevalidationEvent{Entity: "article", Action: "update", IDs: []uint{42}}, time.Now().Add(-time.Minute))
	require.NoError(t, err)
	require.NoError(t, repository.Create(context.Background(), &event))
	return event
}

func TestRevalidationWorkerDeliversControlledEvent(t *testing.T) {
	db, repository := outboxTestRepository(t)
	event := createDueEvent(t, repository)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "Bearer private-token", r.Header.Get("Authorization"))
		var payload RevalidationEvent
		require.NoError(t, json.NewDecoder(r.Body).Decode(&payload))
		assert.Equal(t, RevalidationEvent{Entity: "article", Action: "update", IDs: []uint{42}}, payload)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	worker := NewRevalidationWorker(repository, server.URL, "private-token", server.Client())
	require.NoError(t, worker.RunOnce(context.Background()))
	var stored models.RevalidationOutbox
	require.NoError(t, db.First(&stored, event.ID).Error)
	assert.NotNil(t, stored.ProcessedAt)
	assert.Zero(t, stored.Attempts)
}

func TestRevalidationWorkerPersistsRetryAndRedactsToken(t *testing.T) {
	db, repository := outboxTestRepository(t)
	event := createDueEvent(t, repository)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte("private-token upstream failed"))
	}))
	defer server.Close()

	worker := NewRevalidationWorker(repository, server.URL, "private-token", server.Client())
	now := time.Now()
	worker.now = func() time.Time { return now }
	require.NoError(t, worker.RunOnce(context.Background()))
	var stored models.RevalidationOutbox
	require.NoError(t, db.First(&stored, event.ID).Error)
	assert.Equal(t, 1, stored.Attempts)
	assert.Equal(t, now.Add(time.Minute).Unix(), stored.NextAttemptAt.Unix())
	assert.NotContains(t, stored.LastError, "private-token")
	assert.Contains(t, stored.LastError, "[REDACTED]")
}

func TestRevalidationWorkerRejectsEmptyTokenAndTimesOut(t *testing.T) {
	_, repository := outboxTestRepository(t)
	createDueEvent(t, repository)
	assert.ErrorIs(t, NewRevalidationWorker(repository, "http://example.test", "", nil).RunOnce(context.Background()), ErrMissingRevalidationToken)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()
	client := server.Client()
	client.Timeout = 20 * time.Millisecond
	worker := NewRevalidationWorker(repository, server.URL, "token", client)
	require.NoError(t, worker.RunOnce(context.Background()))
	pending, err := repository.Pending(context.Background(), 10)
	require.NoError(t, err)
	require.Len(t, pending, 1)
	assert.Equal(t, 1, pending[0].Attempts)
	assert.True(t, strings.Contains(strings.ToLower(pending[0].LastError), "timeout") || strings.Contains(strings.ToLower(pending[0].LastError), "deadline"))
}

func TestTwoRevalidationWorkersDeliverClaimedEventOnlyOnce(t *testing.T) {
	_, repository := outboxTestRepository(t)
	createDueEvent(t, repository)
	started := make(chan struct{}, 1)
	release := make(chan struct{})
	var deliveries atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		deliveries.Add(1)
		started <- struct{}{}
		<-release
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	first := NewRevalidationWorker(repository, server.URL, "token", server.Client())
	second := NewRevalidationWorker(repository, server.URL, "token", server.Client())
	firstResult := make(chan error, 1)
	go func() { firstResult <- first.RunOnce(context.Background()) }()
	<-started

	require.NoError(t, second.RunOnce(context.Background()))
	assert.Equal(t, int32(1), deliveries.Load())
	close(release)
	require.NoError(t, <-firstResult)
	assert.Equal(t, int32(1), deliveries.Load())
}

func TestNewOutboxRecordRejectsCallerControlledEntityOrAction(t *testing.T) {
	_, err := NewOutboxRecord(RevalidationEvent{Entity: "tag", Action: "arbitrary", IDs: []uint{1}}, time.Now())
	assert.ErrorIs(t, err, ErrInvalidRevalidationEvent)
}
