package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupRoutesTestEngine 用真实 SetupRoutes 挂全量路由，验证 admin 组
// JWTAuth + RequireAdmin 的实际接线（模式同 routes_alignment_test.go）。
func setupRoutesTestEngine(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	cfg := &config.Config{JWTSecretKey: "test-secret", UploadFolder: "uploads"}
	require.NoError(t, SetupRoutes(r, cfg))
	return r
}

func adminBearerGet(t *testing.T, router http.Handler, path, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func TestAdminVerifyGithubTokenForbidden(t *testing.T) {
	router := setupRoutesTestEngine(t)

	token, err := middleware.GenerateToken("octocat", "github", "test-secret", 3600)
	require.NoError(t, err)

	// GitHub OAuth 用户（provider=github）在 RequireAdmin 处被 403 拦截，
	// 到不了 Verify 处理器。
	w := adminBearerGet(t, router, "/api/admin/verify", token)

	require.Equal(t, http.StatusForbidden, w.Code)
	assert.JSONEq(t, `{"error":"admin access required"}`, w.Body.String())
}

func TestAdminVerifyPasswordTokenAllowed(t *testing.T) {
	router := setupRoutesTestEngine(t)

	token, err := middleware.GenerateToken("admin", "password", "test-secret", 3600)
	require.NoError(t, err)

	// 管理员 token 通过 JWTAuth + RequireAdmin，Verify 语义保持 valid=true。
	w := adminBearerGet(t, router, "/api/admin/verify", token)

	require.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		Code int `json:"code"`
		Data struct {
			Valid    bool   `json:"valid"`
			Username string `json:"username"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.True(t, resp.Data.Valid)
	assert.Equal(t, "admin", resp.Data.Username)
}

func TestAdminAuthMeGithubTokenForbidden(t *testing.T) {
	router := setupRoutesTestEngine(t)

	token, err := middleware.GenerateToken("octocat", "github", "test-secret", 3600)
	require.NoError(t, err)

	// 现有 /api/admin/auth/me 同样获得 RequireAdmin 语义。
	w := adminBearerGet(t, router, "/api/admin/auth/me", token)

	require.Equal(t, http.StatusForbidden, w.Code)
	assert.JSONEq(t, `{"error":"admin access required"}`, w.Body.String())
}

func TestRouteAlignment_GithubOAuthAndMeRoutesRegistered(t *testing.T) {
	router := setupRoutesTestEngine(t)

	// 新 public 路由已注册：无 token/未配置/缺参数时返回业务错误而非 404。
	cases := []struct {
		name   string
		method string
		path   string
	}{
		{name: "github authorize", method: http.MethodGet, path: "/api/auth/github/authorize"},
		{name: "github callback", method: http.MethodGet, path: "/api/auth/github/callback"},
		{name: "exchange", method: http.MethodPost, path: "/api/auth/exchange"},
		{name: "me", method: http.MethodGet, path: "/api/auth/me"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "route should exist")
		})
	}
}
