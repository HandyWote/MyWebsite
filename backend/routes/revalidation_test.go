package routes

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestAdminPendingRevalidationPreservesObservableQueueStatusEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.RevalidationOutbox{}))
	repository := repositories.NewRevalidationOutboxRepository(db)
	nextAttempt := time.Now().Add(5 * time.Minute).UTC().Truncate(time.Millisecond)
	event := models.RevalidationOutbox{
		Entity:        "article",
		Action:        "update",
		IDsJSON:       "[42]",
		Attempts:      2,
		NextAttemptAt: nextAttempt,
		LastError:     "revalidation returned 503",
	}
	require.NoError(t, repository.Create(context.Background(), &event))

	previous := revalidationAdmin
	revalidationAdmin = services.NewRevalidationAdminService(repository, "contract-token")
	t.Cleanup(func() { revalidationAdmin = previous })

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest("GET", "/api/admin/revalidation/pending", nil)
	AdminPendingRevalidation(ctx)

	var envelope struct {
		Code int `json:"code"`
		Data []struct {
			Entity        string    `json:"entity"`
			Action        string    `json:"action"`
			Attempts      int       `json:"attempts"`
			LastError     string    `json:"last_error"`
			NextAttemptAt time.Time `json:"next_attempt_at"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &envelope))
	assert.Equal(t, 0, envelope.Code)
	require.Len(t, envelope.Data, 1)
	assert.Equal(t, "article", envelope.Data[0].Entity)
	assert.Equal(t, "update", envelope.Data[0].Action)
	assert.Equal(t, 2, envelope.Data[0].Attempts)
	assert.Equal(t, "revalidation returned 503", envelope.Data[0].LastError)
	assert.Equal(t, nextAttempt, envelope.Data[0].NextAttemptAt)
	assert.NotContains(t, recorder.Body.String(), "ids_json")
}
