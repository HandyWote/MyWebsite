package routes

// 画布路由行为测试(httptest,全部能死):
//   - 匿名 401 / GitHub token 走全链 / body 或 strokes 非法 400(表驱动)
//   - base_version 过期 409 且不落库
//   - 图形违规 422 不落库 / OCR 词表命中 422 / 全清 200 版本推进
//   - uncertain(未配 LLM)202 且 pending 落库 / 超限 429(fakeClock 注入)
//   - admin 审核:401/403、列表、approve 落库推进、base 落后 superseded 409、
//     reject、重复审核 400/404

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/handywote/website/database"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/models"
	"github.com/handywote/website/ratelimit"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var ensureDrawingTablesOnce sync.Once

// ensureDrawingTables 在共享内存库(file::memory:?cache=shared,与 TestMain
// 同库)上迁移画布两表,只迁一次;drawingRepo 默认走 database.GetDB() 即此库。
func ensureDrawingTables(t *testing.T) {
	t.Helper()
	ensureDrawingTablesOnce.Do(func() {
		db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
		if err != nil {
			t.Fatalf("打开共享内存库失败: %v", err)
		}
		if err := db.AutoMigrate(&models.DrawingVersion{}, &models.DrawingSubmission{}); err != nil {
			t.Fatalf("AutoMigrate drawing 表失败: %v", err)
		}
	})
}

// resetDrawing 清空画布两表,让每个测试从空画布开始,断言与测试顺序解耦。
func resetDrawing(t *testing.T) {
	t.Helper()
	ensureDrawingTables(t)
	require.NoError(t, drawingTestDB(t).Exec("DELETE FROM drawing_versions").Error)
	require.NoError(t, drawingTestDB(t).Exec("DELETE FROM drawing_submissions").Error)
}

// drawingTestDB 复用已初始化的 database.DB(共享内存库)做落库断言。
func drawingTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	require.NotNil(t, database.DB, "TestMain 应已初始化共享内存库")
	return database.DB
}

func drawingTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/games/drawing/canvas", GetDrawingCanvas)
	r.POST("/api/games/drawing/canvas", CreateDrawingCanvas)
	return r
}

func drawingAdminRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	admin := r.Group("/api/admin")
	admin.Use(middleware.JWTAuth("test-jwt-secret"), middleware.RequireAdmin())
	{
		admin.GET("/drawing/submissions", AdminListDrawingSubmissions)
		admin.POST("/drawing/submissions/:id/approve", AdminApproveDrawingSubmission)
		admin.POST("/drawing/submissions/:id/reject", AdminRejectDrawingSubmission)
	}
	return r
}

func postDrawing(t *testing.T, router http.Handler, body, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/games/drawing/canvas", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func getDrawing(t *testing.T, router http.Handler) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/games/drawing/canvas", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func drawingRepoForTest(t *testing.T) *repositories.DrawingRepository {
	t.Helper()
	return repositories.NewDrawingRepository(drawingTestDB(t))
}

// drawingCountVersionRows 数画布版本行数(断言"不落库")。
func drawingCountVersionRows(t *testing.T) int64 {
	t.Helper()
	var count int64
	require.NoError(t, drawingTestDB(t).Model(&models.DrawingVersion{}).Count(&count).Error)
	return count
}

// drawingCountPendingSubmissions 数 pending 投稿数。
func drawingCountPendingSubmissions(t *testing.T) int64 {
	t.Helper()
	var count int64
	require.NoError(t, drawingTestDB(t).Model(&models.DrawingSubmission{}).Where("status = ?", "pending").Count(&count).Error)
	return count
}

// installDrawingModerationStub 整体替换审核链打桩(模式同 githubUserUpserter),
// 返回恢复函数;calls 非 nil 时记录每次调用,供限流计数断言。
func installDrawingModerationStub(t *testing.T, verdict services.DrawingVerdict, reason string, calls *int) {
	t.Helper()
	old := servicesDrawingModeration
	if calls != nil {
		*calls = 0
	}
	servicesDrawingModeration = func(_ context.Context, _ []services.DrawingStroke) (services.DrawingVerdict, string, error) {
		if calls != nil {
			*calls++
		}
		return verdict, reason, nil
	}
	t.Cleanup(func() { servicesDrawingModeration = old })
}

// installDrawingLimiter 替换包级审核限流器(模式同 installLoginLimiter)。
func installDrawingLimiter(t *testing.T, limiter *ratelimit.Limiter) {
	t.Helper()
	old := drawingModerationLimiter
	drawingModerationLimiter = limiter
	t.Cleanup(func() { drawingModerationLimiter = old })
}

func githubTokenForTest(t *testing.T) string {
	t.Helper()
	token, err := middleware.GenerateToken("octocat", "github", "test-jwt-secret", 3600)
	require.NoError(t, err)
	return token
}

// installGithubUserLookup 打桩 meUserLookup(共享内存库无 users 表,真实查询
// 会因表不存在被保守拒绝,模式同 comment_contract_test)。
func installGithubUserLookup(t *testing.T) {
	t.Helper()
	old := meUserLookup
	meUserLookup = func(_ context.Context, _, username string) (*models.User, error) {
		return &models.User{Provider: "github", Username: username, DisplayName: username}, nil
	}
	t.Cleanup(func() { meUserLookup = old })
}

func adminTokenForTest(t *testing.T) string {
	t.Helper()
	token, err := middleware.GenerateToken("admin", "password", "test-jwt-secret", 3600)
	require.NoError(t, err)
	return token
}

func strokeJSON(id string) string {
	return `{"id":"` + id + `","color":"#333333","width":1,"points":[{"x":0.1,"y":0.1,"t":1},{"x":0.2,"y":0.2,"t":2}]}`
}

// drawingSubmissionIDFrom202 从 202 响应取 submission_id。
func drawingSubmissionIDFrom202(t *testing.T, w *httptest.ResponseRecorder) uint {
	t.Helper()
	var resp struct {
		Data struct {
			SubmissionID uint `json:"submission_id"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	return resp.Data.SubmissionID
}

func TestGetDrawingCanvasEmpty(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)

	w := getDrawing(t, drawingTestRouter())
	require.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		Code int `json:"code"`
		Data struct {
			Version   int       `json:"version"`
			Strokes   []any     `json:"strokes"`
			UpdatedAt time.Time `json:"updated_at"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, 0, resp.Code)
	assert.Equal(t, 0, resp.Data.Version)
	assert.Empty(t, resp.Data.Strokes, "空画布 strokes 必须是空数组而不是 null")
}

func TestCreateDrawingCanvasRequiresLogin(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)

	router := drawingTestRouter()
	body := `{"base_version":0,"strokes":[` + strokeJSON("s1") + `]}`

	w := postDrawing(t, router, body, "")
	require.Equal(t, http.StatusUnauthorized, w.Code)
	assert.JSONEq(t, `{"error":"请先登录后再提交"}`, w.Body.String())

	// 无效 token 同样 401。
	w = postDrawing(t, router, body, "not-a-jwt")
	require.Equal(t, http.StatusUnauthorized, w.Code)

	// 两个表都不落库。
	assert.Zero(t, drawingCountVersionRows(t))
	assert.Zero(t, drawingCountPendingSubmissions(t))
}

func TestCreateDrawingCanvasGithubTokenGoesThroughChain(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	installGithubUserLookup(t)

	installDrawingModerationStub(t, services.DrawingClean, "", nil)
	router := drawingTestRouter()

	w := postDrawing(t, router, `{"base_version":0,"strokes":[`+strokeJSON("s1")+`]}`, githubTokenForTest(t))
	require.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		Code int `json:"code"`
		Data struct {
			Version int    `json:"version"`
			Status  string `json:"status"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, 0, resp.Code)
	assert.Equal(t, 1, resp.Data.Version)
	assert.Equal(t, "published", resp.Data.Status)

	// 落库:版本行存在,全量含新笔画,作者是 GitHub 身份。
	current, err := drawingRepoForTest(t).CurrentVersion(context.Background())
	require.NoError(t, err)
	assert.Equal(t, uint(1), current.Version)
	assert.Contains(t, current.Strokes, `"id":"s1"`)
	assert.Equal(t, "octocat", current.CreatedBy)
}

func TestCreateDrawingCanvasInvalidStrokes(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	installGithubUserLookup(t)

	cases := []struct {
		name string
		body string
	}{
		{name: "坏 JSON", body: `{"base_version":0,`},
		{name: "strokes 缺失", body: `{"base_version":0}`},
		{name: "strokes 空数组", body: `{"base_version":0,"strokes":[]}`},
		{name: "缺 id", body: `{"base_version":0,"strokes":[{"color":"#333","width":1,"points":[{"x":0.1,"y":0.1,"t":1}]}]}`},
		{name: "id 超长", body: `{"base_version":0,"strokes":[{"id":"` + strings.Repeat("a", 65) + `","color":"#333","width":1,"points":[{"x":0.1,"y":0.1,"t":1}]}]}`},
		{name: "缺 color", body: `{"base_version":0,"strokes":[{"id":"s1","width":1,"points":[{"x":0.1,"y":0.1,"t":1}]}]}`},
		{name: "color 超长", body: `{"base_version":0,"strokes":[{"id":"s1","color":"` + strings.Repeat("c", 33) + `","width":1,"points":[{"x":0.1,"y":0.1,"t":1}]}]}`},
		{name: "width 为 0", body: `{"base_version":0,"strokes":[{"id":"s1","color":"#333","width":0,"points":[{"x":0.1,"y":0.1,"t":1}]}]}`},
		{name: "width 大于 1", body: `{"base_version":0,"strokes":[{"id":"s1","color":"#333","width":1.5,"points":[{"x":0.1,"y":0.1,"t":1}]}]}`},
		{name: "x 越界", body: `{"base_version":0,"strokes":[{"id":"s1","color":"#333","width":1,"points":[{"x":1.5,"y":0.1,"t":1}]}]}`},
		{name: "y 越界", body: `{"base_version":0,"strokes":[{"id":"s1","color":"#333","width":1,"points":[{"x":0.1,"y":-0.5,"t":1}]}]}`},
		{name: "points 空", body: `{"base_version":0,"strokes":[{"id":"s1","color":"#333","width":1,"points":[]}]}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := postDrawing(t, drawingTestRouter(), tc.body, githubTokenForTest(t))
			require.Equal(t, http.StatusBadRequest, w.Code, tc.body)
			assert.JSONEq(t, `{"error":"invalid strokes"}`, w.Body.String())
			assert.Zero(t, drawingCountVersionRows(t), "非法输入不落库")
		})
	}
}

func TestCreateDrawingCanvasVersionConflict(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	installGithubUserLookup(t)

	installDrawingModerationStub(t, services.DrawingClean, "", nil)
	router := drawingTestRouter()

	// 先发一版把当前 version 推到 1。
	w := postDrawing(t, router, `{"base_version":0,"strokes":[`+strokeJSON("s1")+`]}`, githubTokenForTest(t))
	require.Equal(t, http.StatusOK, w.Code)

	// 旧 base_version 再投 → 409,current_version 正确,不落新库。
	w = postDrawing(t, router, `{"base_version":0,"strokes":[`+strokeJSON("s2")+`]}`, githubTokenForTest(t))
	require.Equal(t, http.StatusConflict, w.Code)
	assert.JSONEq(t, `{"error":"version conflict","current_version":1}`, w.Body.String())
	assert.Equal(t, int64(1), drawingCountVersionRows(t), "冲突不落库")
}

// TestCreateDrawingCanvasConflictArbitratedAtWrite 审核放行后画布被并发推进
// (模拟请求在窗口内被别人抢先):写入时仲裁 → 409 附 current_version,而不是
// 旧实现的静默双写或 500;冲突方不落新行。base_version 离谱过期(0 vs 现 5)
// 同样走写入仲裁,不再依赖请求入口的读-比对。
func TestCreateDrawingCanvasConflictArbitratedAtWrite(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	installGithubUserLookup(t)

	// 画布先被推到 v5(模拟请求在途时他人连续发布);审核放行(计数 +1),
	// 老视图(base=0)写入仲裁失败 → 409 + current_version=5。
	calls := 0
	installDrawingModerationStub(t, services.DrawingClean, "", &calls)
	router := drawingTestRouter()

	for i := 0; i < 5; i++ {
		_, err := drawingRepoForTest(t).AppendStrokes(context.Background(), uint(i), `[`+strokeJSON(fmt.Sprintf("pre%d", i))+`]`, "seed")
		require.NoError(t, err)
	}

	// 老视图(base=0)提交:审核放行(计数 +1),写入仲裁失败 → 409 + current_version=5。
	w := postDrawing(t, router, `{"base_version":0,"strokes":[`+strokeJSON("late")+`]}`, githubTokenForTest(t))
	require.Equal(t, http.StatusConflict, w.Code)
	assert.JSONEq(t, `{"error":"version conflict","current_version":5}`, w.Body.String())
	assert.Equal(t, 1, calls, "审核链真实放行后才仲裁")
	assert.Equal(t, int64(5), drawingCountVersionRows(t), "冲突方不落新行")
}

func TestCreateDrawingCanvasGraphicViolationNotPersisted(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	installGithubUserLookup(t)

	installDrawingModerationStub(t, services.DrawingViolation, "graphic", nil)

	w := postDrawing(t, drawingTestRouter(), `{"base_version":0,"strokes":[`+strokeJSON("s1")+`]}`, githubTokenForTest(t))
	require.Equal(t, http.StatusUnprocessableEntity, w.Code)
	assert.JSONEq(t, `{"error":"rejected","reason":"graphic"}`, w.Body.String())
	assert.Zero(t, drawingCountVersionRows(t), "图形违规不落 drawing_versions")
	assert.Zero(t, drawingCountPendingSubmissions(t), "图形违规不落 drawing_submissions")
}

func TestCreateDrawingCanvasOCRHitNotPersisted(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	installGithubUserLookup(t)

	installDrawingModerationStub(t, services.DrawingOCRHit, "ocr", nil)

	w := postDrawing(t, drawingTestRouter(), `{"base_version":0,"strokes":[`+strokeJSON("s1")+`]}`, githubTokenForTest(t))
	require.Equal(t, http.StatusUnprocessableEntity, w.Code)
	assert.JSONEq(t, `{"error":"rejected","reason":"ocr"}`, w.Body.String())
	assert.Zero(t, drawingCountVersionRows(t))
	assert.Zero(t, drawingCountPendingSubmissions(t))
}

func TestCreateDrawingCanvasUncertainCreatesPendingSubmission(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	installGithubUserLookup(t)

	installDrawingModerationStub(t, services.DrawingPending, "graphic-moderation-unconfigured", nil)

	w := postDrawing(t, drawingTestRouter(), `{"base_version":0,"strokes":[`+strokeJSON("s1")+`]}`, githubTokenForTest(t))
	require.Equal(t, http.StatusAccepted, w.Code)
	assert.NotZero(t, drawingSubmissionIDFrom202(t, w))

	// pending 落库,画布版本不推进。
	assert.Equal(t, int64(1), drawingCountPendingSubmissions(t))
	assert.Zero(t, drawingCountVersionRows(t))
}

func TestCreateDrawingCanvasAdminTokenAlsoAllowed(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	t.Setenv("ADMIN_USERNAME", "test-admin")

	installDrawingModerationStub(t, services.DrawingClean, "", nil)

	w := postDrawing(t, drawingTestRouter(), `{"base_version":0,"strokes":[`+strokeJSON("s1")+`]}`, adminTokenForTest(t))
	require.Equal(t, http.StatusOK, w.Code)
}

func TestDrawingModerationRateLimit(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	installGithubUserLookup(t)

	// fakeClock 注入:窗口 1 小时,上限 2 次(模式同 login_ratelimit_test)。
	clock := &fakeClock{now: time.Now()}
	installDrawingLimiter(t, ratelimit.New(2, time.Hour, clock))

	calls := 0
	installDrawingModerationStub(t, services.DrawingPending, "any", &calls)

	router := drawingTestRouter()
	post := func() *httptest.ResponseRecorder {
		return postDrawing(t, router, `{"base_version":0,"strokes":[`+strokeJSON("s1")+`]}`, githubTokenForTest(t))
	}

	// 前两次触发审核:202(转人工)且各计一次。
	for i := 0; i < 2; i++ {
		w := post()
		require.Equal(t, http.StatusAccepted, w.Code)
	}
	assert.Equal(t, 2, calls)

	// 第 3 次超限:429,审核链不再被调(成本防护),不落库。
	w := post()
	require.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.JSONEq(t, `{"error":"提交过于频繁,请稍后再试"}`, w.Body.String())
	assert.Equal(t, 2, calls, "超限后不再触发审核链")

	// 窗口过期后恢复。
	clock.now = clock.now.Add(2 * time.Hour)
	w = post()
	require.Equal(t, http.StatusAccepted, w.Code)
	assert.Equal(t, 3, calls)
}

func TestDrawingRateLimitCountsRejectedSubmissions(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
	installGithubUserLookup(t)

	// 限流语义:真实触发审核(违规拒也算)计一次;超限 429 不再计。
	clock := &fakeClock{now: time.Now()}
	installDrawingLimiter(t, ratelimit.New(1, time.Hour, clock))
	installDrawingModerationStub(t, services.DrawingViolation, "graphic", nil)
	router := drawingTestRouter()

	// 第一次:审核触发并拒绝(422),消耗唯一额度。
	w := postDrawing(t, router, `{"base_version":0,"strokes":[`+strokeJSON("s1")+`]}`, githubTokenForTest(t))
	require.Equal(t, http.StatusUnprocessableEntity, w.Code)

	// 第二次:超限 429(即使同样会被拒,审核也不该再跑)。
	w = postDrawing(t, router, `{"base_version":0,"strokes":[`+strokeJSON("s2")+`]}`, githubTokenForTest(t))
	require.Equal(t, http.StatusTooManyRequests, w.Code)
}

func TestDrawingAdminAuthz(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)

	router := drawingAdminRouter()
	get := func(token string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/api/admin/drawing/submissions", nil)
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		return w
	}

	// 匿名 → 401。
	w := get("")
	require.Equal(t, http.StatusUnauthorized, w.Code)

	// GitHub token → 403(RequireAdmin)。
	w = get(githubTokenForTest(t))
	require.Equal(t, http.StatusForbidden, w.Code)
	assert.JSONEq(t, `{"error":"admin access required"}`, w.Body.String())

	// 管理员 token → 200 空列表信封。
	w = get(adminTokenForTest(t))
	require.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		Code int `json:"code"`
		Data struct {
			Submissions []any `json:"submissions"`
			Total       int64 `json:"total"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, 0, resp.Code)
	assert.Empty(t, resp.Data.Submissions)
	assert.Equal(t, int64(0), resp.Data.Total)
}

// seedPendingSubmission 直接落一条 pending 投稿,返回其 ID;测试结束清理。
func seedPendingSubmission(t *testing.T, baseVersion uint) uint {
	t.Helper()
	submission := models.DrawingSubmission{BaseVersion: baseVersion, Strokes: `[` + strokeJSON("sub1") + `]`, Status: "pending", CreatedBy: "octocat"}
	require.NoError(t, drawingRepoForTest(t).CreateSubmission(context.Background(), &submission))
	t.Cleanup(func() {
		require.NoError(t, drawingTestDB(t).Unscoped().Delete(&models.DrawingSubmission{}, submission.ID).Error)
	})
	return submission.ID
}

func drawingAdminPost(t *testing.T, path, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	drawingAdminRouter().ServeHTTP(w, req)
	return w
}

func TestDrawingAdminListFiltersByStatus(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)

	id := seedPendingSubmission(t, 1)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/drawing/submissions?status=pending&limit=50", nil)
	req.Header.Set("Authorization", "Bearer "+adminTokenForTest(t))
	w := httptest.NewRecorder()
	drawingAdminRouter().ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			Submissions []models.DrawingSubmission `json:"submissions"`
			Total       int64                      `json:"total"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, int64(1), resp.Data.Total)
	require.Len(t, resp.Data.Submissions, 1)
	assert.Equal(t, id, resp.Data.Submissions[0].ID)
	assert.Equal(t, "octocat", resp.Data.Submissions[0].CreatedBy)
}

func TestDrawingAdminApprovePublishesSubmission(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)

	// 画布先有一版(投稿 base_version=1 与之一致)。
	_, err := drawingRepoForTest(t).AppendStrokes(context.Background(), 0, `[`+strokeJSON("base")+`]`, "seed")
	require.NoError(t, err)
	id := seedPendingSubmission(t, 1)

	w := drawingAdminPost(t, "/api/admin/drawing/submissions/"+strconv.FormatUint(uint64(id), 10)+"/approve", adminTokenForTest(t))
	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			ID     uint   `json:"id"`
			Status string `json:"status"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, id, resp.Data.ID)
	assert.Equal(t, "approved", resp.Data.Status)

	// 落库:画布推进到 v2 且包含投稿笔画;投稿 approved + ReviewedBy。
	repo := drawingRepoForTest(t)
	current, err := repo.CurrentVersion(context.Background())
	require.NoError(t, err)
	assert.Equal(t, uint(2), current.Version)
	assert.Contains(t, current.Strokes, `"id":"sub1"`)

	got, err := repo.GetSubmission(context.Background(), id)
	require.NoError(t, err)
	assert.Equal(t, "approved", got.Status)
	assert.Equal(t, "admin", got.ReviewedBy)
	require.NotNil(t, got.ReviewedAt)
}

func TestDrawingAdminApproveSupersededWhenBaseBehind(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)

	repo := drawingRepoForTest(t)
	// 画布推两版,投稿基于 v1 → 已过期。
	_, err := repo.AppendStrokes(context.Background(), 0, `[`+strokeJSON("base")+`]`, "seed")
	require.NoError(t, err)
	_, err = repo.AppendStrokes(context.Background(), 1, `[`+strokeJSON("base2")+`]`, "seed")
	require.NoError(t, err)
	id := seedPendingSubmission(t, 1)

	w := drawingAdminPost(t, "/api/admin/drawing/submissions/"+strconv.FormatUint(uint64(id), 10)+"/approve", adminTokenForTest(t))
	require.Equal(t, http.StatusConflict, w.Code)
	assert.JSONEq(t, `{"error":"base version superseded","data":{"status":"superseded"}}`, w.Body.String())

	// 画布版本没推进,投稿标 superseded + ReviewedBy。
	current, err := repo.CurrentVersion(context.Background())
	require.NoError(t, err)
	assert.Equal(t, uint(2), current.Version)
	got, err := repo.GetSubmission(context.Background(), id)
	require.NoError(t, err)
	assert.Equal(t, "superseded", got.Status)
	assert.Equal(t, "admin", got.ReviewedBy)
}

func TestDrawingAdminRejectSubmission(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)

	id := seedPendingSubmission(t, 0)

	w := drawingAdminPost(t, "/api/admin/drawing/submissions/"+strconv.FormatUint(uint64(id), 10)+"/reject", adminTokenForTest(t))
	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Code int `json:"code"`
		Data struct {
			ID     uint   `json:"id"`
			Status string `json:"status"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, id, resp.Data.ID)
	assert.Equal(t, "rejected", resp.Data.Status)

	got, err := drawingRepoForTest(t).GetSubmission(context.Background(), id)
	require.NoError(t, err)
	assert.Equal(t, "rejected", got.Status)
	assert.Zero(t, drawingCountVersionRows(t), "拒绝不推进画布")
}

func TestDrawingAdminReReviewReturnsBadRequest(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)

	// 先 reject 一次。
	id := seedPendingSubmission(t, 0)
	require.Equal(t, http.StatusOK, drawingAdminPost(t, "/api/admin/drawing/submissions/"+strconv.FormatUint(uint64(id), 10)+"/reject", adminTokenForTest(t)).Code)

	// 重复 reject → 400。
	w := drawingAdminPost(t, "/api/admin/drawing/submissions/"+strconv.FormatUint(uint64(id), 10)+"/reject", adminTokenForTest(t))
	require.Equal(t, http.StatusBadRequest, w.Code)

	// approve 已拒投稿同样 400。
	w = drawingAdminPost(t, "/api/admin/drawing/submissions/"+strconv.FormatUint(uint64(id), 10)+"/approve", adminTokenForTest(t))
	require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDrawingAdminReviewUnknownIDNotFound(t *testing.T) {
	ensureDrawingTables(t)
	resetDrawing(t)

	for _, path := range []string{
		"/api/admin/drawing/submissions/9999/approve",
		"/api/admin/drawing/submissions/9999/reject",
	} {
		w := drawingAdminPost(t, path, adminTokenForTest(t))
		require.Equal(t, http.StatusNotFound, w.Code, path)
	}
}
