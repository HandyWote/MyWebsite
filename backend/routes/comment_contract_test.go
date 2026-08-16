package routes

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildCommentLimiterIdentity(t *testing.T) {
	assert.Equal(t, "a@b.com", buildCommentLimiterIdentity("a@b.com", "1.2.3.4"))
	assert.Equal(t, "1.2.3.4", buildCommentLimiterIdentity("", "1.2.3.4"))
	assert.Equal(t, "anonymous", buildCommentLimiterIdentity("", ""))
}

// commentTestRouter 只挂 POST /api/articles/:id/comments，不依赖 SetupRoutes。
// 共享内存库只迁移了文章/outbox（见 TestMain），评论表在首次测试时补迁。
var ensureCommentTableOnce sync.Once

func ensureCommentTable(t *testing.T) {
	t.Helper()
	ensureCommentTableOnce.Do(func() {
		if err := database.DB.AutoMigrate(&models.Comment{}); err != nil {
			t.Fatalf("AutoMigrate Comment 失败: %v", err)
		}
	})
}

func commentTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/articles/:id/comments", CreateComment)
	return r
}

func postComment(t *testing.T, router http.Handler, body, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/articles/7/comments", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func commentResponseData(t *testing.T, w *httptest.ResponseRecorder) models.Comment {
	t.Helper()
	var resp struct {
		Data models.Comment `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	return resp.Data
}

func TestCreateCommentGithubIdentityOverride(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	t.Setenv("COMMENT_LIMIT_ENABLED", "false")

	oldLookup := meUserLookup
	meUserLookup = func(_ context.Context, provider, username string) (*models.User, error) {
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

	ensureCommentTable(t)
	// 客户端伪造的 author 必须被服务端 GitHub 身份覆盖，头像取 users 表链接。
	w := postComment(t, commentTestRouter(), `{"author":"fake name","email":"fake@example.com","content":"hello from github"}`, token)
	require.Equal(t, http.StatusOK, w.Code)
	data := commentResponseData(t, w)
	assert.Equal(t, "Octo Cat", data.Author)
	assert.Equal(t, "https://avatars.example.com/octocat.png", data.AvatarURL)
}

func TestCreateCommentGithubIdentityFallsBackToUsername(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	t.Setenv("COMMENT_LIMIT_ENABLED", "false")

	oldLookup := meUserLookup
	meUserLookup = func(_ context.Context, provider, username string) (*models.User, error) {
		// DisplayName 为空时回退 Username。
		return &models.User{Provider: "github", Username: "octocat", AvatarURL: ""}, nil
	}
	defer func() { meUserLookup = oldLookup }()

	token, err := middleware.GenerateToken("octocat", "github", "test-jwt-secret", 3600)
	require.NoError(t, err)

	ensureCommentTable(t)
	w := postComment(t, commentTestRouter(), `{"author":"fake","content":"hi"}`, token)
	require.Equal(t, http.StatusOK, w.Code)
	data := commentResponseData(t, w)
	assert.Equal(t, "octocat", data.Author)
	assert.Empty(t, data.AvatarURL)
}

func TestCreateCommentRequiresLogin(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	t.Setenv("ADMIN_USERNAME", "test-admin")
	t.Setenv("COMMENT_LIMIT_ENABLED", "false")
	ensureCommentTable(t)

	// 无 token → 401，匿名评论不再被接受。
	w := postComment(t, commentTestRouter(), `{"author":"anon","content":"hello"}`, "")
	require.Equal(t, http.StatusUnauthorized, w.Code)

	// 无效 token → 401。
	w = postComment(t, commentTestRouter(), `{"author":"anon2","content":"hello"}`, "not-a-jwt")
	require.Equal(t, http.StatusUnauthorized, w.Code)

	// admin token（provider=password）→ 200，author 恒为服务端管理员身份，手填被覆盖。
	adminToken, err := middleware.GenerateToken("admin", "password", "test-jwt-secret", 3600)
	require.NoError(t, err)
	w = postComment(t, commentTestRouter(), `{"author":"anon3","content":"hello"}`, adminToken)
	require.Equal(t, http.StatusOK, w.Code)
	data := commentResponseData(t, w)
	assert.Equal(t, "test-admin", data.Author)
	assert.Empty(t, data.AvatarURL)
}

func TestCreateCommentGithubIdentityWithoutUserRow(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	t.Setenv("COMMENT_LIMIT_ENABLED", "false")

	oldLookup := meUserLookup
	meUserLookup = func(_ context.Context, provider, username string) (*models.User, error) {
		// users 表查不到 → 不拒绝，回退 claims.Username 作作者（与 Me handler 容错一致）。
		return nil, nil
	}
	defer func() { meUserLookup = oldLookup }()

	token, err := middleware.GenerateToken("octocat", "github", "test-jwt-secret", 3600)
	require.NoError(t, err)

	ensureCommentTable(t)
	w := postComment(t, commentTestRouter(), `{"author":"fake","content":"hi"}`, token)
	require.Equal(t, http.StatusOK, w.Code)
	data := commentResponseData(t, w)
	assert.Equal(t, "octocat", data.Author)
	assert.Empty(t, data.AvatarURL)
}
