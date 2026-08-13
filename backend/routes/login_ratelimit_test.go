package routes

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/ratelimit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeClock 实现 ratelimit.Clock，让登录限流测试可控推进时间。
type fakeClock struct{ now time.Time }

func (f *fakeClock) Now() time.Time { return f.now }

// loginTestRouter 直接挂 Login，配合可注入的 loginLimiter，不依赖 SetupRoutes。
func loginTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/auth/login", Login)
	return r
}

func loginPost(t *testing.T, router http.Handler, username, password, xff string) *httptest.ResponseRecorder {
	t.Helper()
	body := []byte(`{"username":"` + username + `","password":"` + password + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	if xff != "" {
		req.Header.Set("X-Forwarded-For", xff)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// installLoginLimiter 替换包级 loginLimiter，返回恢复函数。
func installLoginLimiter(limiter *ratelimit.Limiter) func() {
	old := loginLimiter
	loginLimiter = limiter
	return func() { loginLimiter = old }
}

func TestLoginRateLimitBlocksAfterMaxFailures(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "admin123")

	clock := &fakeClock{now: time.Now()}
	defer installLoginLimiter(ratelimit.New(2, time.Hour, clock))() // 2 次失败锁 1 小时

	router := loginTestRouter()

	// 前两次失败：401，未锁定。
	for i := 0; i < 2; i++ {
		w := loginPost(t, router, "admin", "wrong", "203.0.113.7")
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	}

	// 第三次即使密码正确也被锁：429。
	w := loginPost(t, router, "admin", "admin123", "203.0.113.7")
	require.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.JSONEq(t, `{"error":"too many attempts, try again later"}`, w.Body.String())

	// 窗口过期后恢复，正确凭据可登录。
	clock.now = clock.now.Add(2 * time.Hour)
	w = loginPost(t, router, "admin", "admin123", "203.0.113.7")
	require.Equal(t, http.StatusOK, w.Code)
}

func TestLoginRateLimitKeyIsolatedByIP(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "admin123")

	defer installLoginLimiter(ratelimit.New(2, time.Hour, nil))()

	router := loginTestRouter()

	// IP A 连续失败 2 次。
	for i := 0; i < 2; i++ {
		w := loginPost(t, router, "admin", "wrong", "203.0.113.7")
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	}

	// IP B 不受影响：密码正确仍可登录。
	w := loginPost(t, router, "admin", "admin123", "203.0.113.8")
	require.Equal(t, http.StatusOK, w.Code)

	// X-Forwarded-For 取首值：多级代理头也只按第一个 IP 计。
	for i := 0; i < 2; i++ {
		w := loginPost(t, router, "admin", "wrong", "203.0.113.9, 10.0.0.1")
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	}
	w = loginPost(t, router, "admin", "admin123", "203.0.113.9, 10.0.0.1")
	require.Equal(t, http.StatusTooManyRequests, w.Code, "X-Forwarded-For 首值应被锁定")
}

func TestLoginRateLimitFallsBackToClientIP(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "admin123")

	defer installLoginLimiter(ratelimit.New(2, time.Hour, nil))()

	router := loginTestRouter()

	// 无 X-Forwarded-For 时回退 c.ClientIP()（httptest 默认 RemoteAddr）。
	for i := 0; i < 2; i++ {
		w := loginPost(t, router, "admin", "wrong", "")
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	}

	// 带 X-Forwarded-For 的请求走不同 key，不受 ClientIP 计数影响。
	w := loginPost(t, router, "admin", "admin123", "203.0.113.7")
	require.Equal(t, http.StatusOK, w.Code)

	// 无 X-Forwarded-For 的请求已锁。
	w = loginPost(t, router, "admin", "admin123", "")
	require.Equal(t, http.StatusTooManyRequests, w.Code)
}

func TestLoginRateLimitResetOnSuccess(t *testing.T) {
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "admin123")

	defer installLoginLimiter(ratelimit.New(2, time.Hour, nil))()

	router := loginTestRouter()

	// 1 次失败后成功登录：Reset 清零计数。
	w := loginPost(t, router, "admin", "wrong", "203.0.113.7")
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	w = loginPost(t, router, "admin", "admin123", "203.0.113.7")
	require.Equal(t, http.StatusOK, w.Code)

	// 若未 Reset，此处再失败 1 次即达上限；实际计数已清零，仍可登录。
	w = loginPost(t, router, "admin", "wrong", "203.0.113.7")
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	w = loginPost(t, router, "admin", "admin123", "203.0.113.7")
	require.Equal(t, http.StatusOK, w.Code)
}

func TestLoginRateLimitDisabledByDefault(t *testing.T) {
	// loginLimiter 未显式配置（configureServices 之前）时为禁用态，不限流。
	t.Setenv("ADMIN_USERNAME", "admin")
	t.Setenv("ADMIN_PASSWORD", "admin123")

	defer installLoginLimiter(ratelimit.New(0, 0, nil))()

	router := loginTestRouter()

	for i := 0; i < 5; i++ {
		w := loginPost(t, router, "admin", "wrong", "203.0.113.7")
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	}
	w := loginPost(t, router, "admin", "admin123", "203.0.113.7")
	require.Equal(t, http.StatusOK, w.Code)
}
