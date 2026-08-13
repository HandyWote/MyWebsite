package routes

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// meTestRouter 只挂 GET /api/auth/me，不依赖 SetupRoutes。
func meTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/auth/me", Me)
	return r
}

func meGet(t *testing.T, router http.Handler, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func meResponseBody(t *testing.T, w *httptest.ResponseRecorder) struct {
	Code int `json:"code"`
	Data struct {
		Username    string `json:"username"`
		Provider    string `json:"provider"`
		DisplayName string `json:"display_name"`
		AvatarURL   string `json:"avatar_url"`
	} `json:"data"`
} {
	t.Helper()
	var resp struct {
		Code int `json:"code"`
		Data struct {
			Username    string `json:"username"`
			Provider    string `json:"provider"`
			DisplayName string `json:"display_name"`
			AvatarURL   string `json:"avatar_url"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	return resp
}

func TestMeNoToken(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	router := meTestRouter()

	w := meGet(t, router, "")

	require.Equal(t, http.StatusUnauthorized, w.Code)
	assert.JSONEq(t, `{"error":"not authenticated"}`, w.Body.String())
}

func TestMeInvalidToken(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	router := meTestRouter()

	w := meGet(t, router, "not-a-jwt")

	require.Equal(t, http.StatusUnauthorized, w.Code)
	assert.JSONEq(t, `{"error":"not authenticated"}`, w.Body.String())
}

func TestMePasswordToken(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	router := meTestRouter()

	token, err := middleware.GenerateToken("admin", "password", "test-jwt-secret", 3600)
	require.NoError(t, err)

	w := meGet(t, router, token)

	require.Equal(t, http.StatusOK, w.Code)
	resp := meResponseBody(t, w)
	assert.Equal(t, "admin", resp.Data.Username)
	assert.Equal(t, "password", resp.Data.Provider)
	// 管理员只回 username/provider，无展示字段。
	assert.Empty(t, resp.Data.DisplayName)
	assert.Empty(t, resp.Data.AvatarURL)
}

func TestMeLegacyTokenDefaultsToPasswordProvider(t *testing.T) {
	// 旧 token（升级前签发）无 provider 字段 → 按 "password" 兼容，与 JWTAuth 一致。
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	router := meTestRouter()

	legacy := jwt.NewWithClaims(jwt.SigningMethodHS256, middleware.Claims{
		Username: "oldadmin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	})
	token, err := legacy.SignedString([]byte("test-jwt-secret"))
	require.NoError(t, err)

	w := meGet(t, router, token)

	require.Equal(t, http.StatusOK, w.Code)
	resp := meResponseBody(t, w)
	assert.Equal(t, "oldadmin", resp.Data.Username)
	assert.Equal(t, "password", resp.Data.Provider)
}

func TestMeGithubTokenEnrichesFromUsersTable(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")

	oldLookup := meUserLookup
	meUserLookup = func(_ context.Context, provider, username string) (*models.User, error) {
		assert.Equal(t, "github", provider)
		assert.Equal(t, "octocat", username)
		return &models.User{
			Provider:    "github",
			Username:    "octocat",
			DisplayName: "Octo Cat",
			AvatarURL:   "https://avatars.example.com/octocat.png",
		}, nil
	}
	defer func() { meUserLookup = oldLookup }()

	token, err := middleware.GenerateToken("octocat", "github", "test-jwt-secret", 3600)
	require.NoError(t, err)

	w := meGet(t, meTestRouter(), token)

	require.Equal(t, http.StatusOK, w.Code)
	resp := meResponseBody(t, w)
	assert.Equal(t, "octocat", resp.Data.Username)
	assert.Equal(t, "github", resp.Data.Provider)
	assert.Equal(t, "Octo Cat", resp.Data.DisplayName)
	assert.Equal(t, "https://avatars.example.com/octocat.png", resp.Data.AvatarURL)
}

func TestMeGithubTokenWithoutUserRow(t *testing.T) {
	// users 表查不到（或查询失败）→ 只回 username/provider，不 500。
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")

	oldLookup := meUserLookup
	meUserLookup = func(_ context.Context, provider, username string) (*models.User, error) {
		return nil, gorm.ErrRecordNotFound
	}
	defer func() { meUserLookup = oldLookup }()

	token, err := middleware.GenerateToken("ghost", "github", "test-jwt-secret", 3600)
	require.NoError(t, err)

	w := meGet(t, meTestRouter(), token)

	require.Equal(t, http.StatusOK, w.Code)
	resp := meResponseBody(t, w)
	assert.Equal(t, "ghost", resp.Data.Username)
	assert.Equal(t, "github", resp.Data.Provider)
	assert.Empty(t, resp.Data.DisplayName)
	assert.Empty(t, resp.Data.AvatarURL)
}
