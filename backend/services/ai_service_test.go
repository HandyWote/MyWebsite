package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/config"
	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func aiServiceTest(t *testing.T, client *http.Client) (*gorm.DB, *AIService) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.AISetting{}, &models.Article{}))
	return db, NewAIService(repositories.NewAISettingRepository(db), repositories.NewArticleRepository(db), client)
}

func TestAIServiceConfigPriorityUsesOnlyValidDatabaseConfiguration(t *testing.T) {
	db, service := aiServiceTest(t, nil)
	environment := &config.Config{OpenAIAPIKey: "env-secret", OpenAIModel: "env-model", OpenAIAPIURL: "https://env.example/v1"}

	resolved, _, err := service.ResolveConfig(context.Background(), environment)
	require.NoError(t, err)
	assert.Equal(t, "env-secret", resolved.APIKey)

	require.NoError(t, db.Create(&models.AISetting{APIKey: "db-secret", Model: "db-model", BaseURL: "https://db.example/v1"}).Error)
	resolved, _, err = service.ResolveConfig(context.Background(), environment)
	require.NoError(t, err)
	assert.Equal(t, ResolvedAIConfig{APIKey: "db-secret", Model: "db-model", BaseURL: "https://db.example/v1"}, resolved)

	require.NoError(t, db.Model(&models.AISetting{}).Where("id = 1").Update("model", "").Error)
	resolved, _, err = service.ResolveConfig(context.Background(), environment)
	require.NoError(t, err)
	assert.Equal(t, "env-secret", resolved.APIKey)
}

func TestCallChatCompletionRequestParsingAndSecretRedaction(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/chat/completions", r.URL.Path)
		assert.Equal(t, "Bearer upstream-secret", r.Header.Get("Authorization"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"ok"}}]}`))
	}))
	defer server.Close()
	cfg := ResolvedAIConfig{APIKey: "upstream-secret", Model: "model", BaseURL: server.URL + "/v1"}
	result, err := callChatCompletion(context.Background(), server.Client(), cfg, []Message{{Role: "user", Content: "hello"}}, time.Second)
	require.NoError(t, err)
	assert.Equal(t, "ok", result)

	failure := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":{"message":"key upstream-secret rejected"}}`))
	}))
	defer failure.Close()
	cfg.BaseURL = failure.URL
	_, err = callChatCompletion(context.Background(), failure.Client(), cfg, []Message{{Role: "user", Content: "hello"}}, time.Second)
	require.Error(t, err)
	assert.NotContains(t, err.Error(), "upstream-secret")
	assert.Contains(t, err.Error(), "[REDACTED]")
}

func TestCallChatCompletionHonorsTimeoutAndRejectsMissingConfig(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(100 * time.Millisecond)
		_, _ = w.Write([]byte(`{"choices":[]}`))
	}))
	defer server.Close()
	cfg := ResolvedAIConfig{APIKey: "secret", Model: "model", BaseURL: server.URL}
	_, err := callChatCompletion(context.Background(), server.Client(), cfg, []Message{{Role: "user", Content: "hello"}}, 10*time.Millisecond)
	require.Error(t, err)
	assert.True(t, strings.Contains(strings.ToLower(err.Error()), "deadline") || strings.Contains(strings.ToLower(err.Error()), "timeout"))

	_, err = callChatCompletion(context.Background(), nil, ResolvedAIConfig{}, nil, time.Second)
	assert.EqualError(t, err, "AI is not configured")
}

func TestMaskAPIKeyNeverReturnsSecret(t *testing.T) {
	assert.Equal(t, "abcd****wxyz", MaskAPIKey("abcdefghwxyz"))
	assert.Equal(t, "****", MaskAPIKey("short"))
}
