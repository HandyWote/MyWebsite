package repositories

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// drawingRepoTestDB 每个测试独立内存库,迁移画布两表。
func drawingRepoTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.DrawingVersion{}, &models.DrawingSubmission{}))
	return db
}

func TestCurrentVersionEmptyCanvasIsVersionZero(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)

	// 无记录:不算错,返回 version=0、strokes 空数组。
	version, err := repo.CurrentVersion(context.Background())
	require.NoError(t, err)
	assert.Equal(t, uint(0), version.Version)
	assert.Equal(t, "[]", version.Strokes)
}

func TestAppendStrokesBuildsFullSnapshotAndAdvancesVersion(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)
	ctx := context.Background()

	v1, err := repo.AppendStrokes(ctx, 0, `[{"id":"a","color":"#000","width":1,"points":[{"x":0,"y":0,"t":1}]}]`, "octocat")
	require.NoError(t, err)
	assert.Equal(t, uint(1), v1.Version)

	v2, err := repo.AppendStrokes(ctx, 1, `[{"id":"b","color":"#111","width":0.5,"points":[{"x":1,"y":1,"t":2}]}]`, "octocat")
	require.NoError(t, err)
	assert.Equal(t, uint(2), v2.Version)

	// 第二版全量 = 旧 + 新(首笔最旧)。
	var stored []map[string]any
	require.NoError(t, json.Unmarshal([]byte(v2.Strokes), &stored))
	require.Len(t, stored, 2)
	assert.Equal(t, "a", stored[0]["id"])
	assert.Equal(t, "b", stored[1]["id"])

	// CurrentVersion 取到最新行。
	current, err := repo.CurrentVersion(ctx)
	require.NoError(t, err)
	assert.Equal(t, uint(2), current.Version)
}

func TestAppendStrokesTrimsOldestBeyondLimit(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)
	ctx := context.Background()

	// 直接塞满上限笔。
	full := make([]map[string]any, maxCanvasStrokes)
	for i := range full {
		full[i] = map[string]any{"id": string(rune('a' + i%26)), "color": "#000", "width": 1, "points": []map[string]any{{"x": 0, "y": 0, "t": i}}}
	}
	seeded, err := json.Marshal(full)
	require.NoError(t, err)
	v1, err := repo.AppendStrokes(ctx, 0, string(seeded), "seed")
	require.NoError(t, err)
	assert.Equal(t, uint(1), v1.Version)

	// 再追加 1 笔 → 总数超上限,最旧的被裁掉,长度封顶。
	_, err = repo.AppendStrokes(ctx, 1, `[{"id":"new","color":"#000","width":1,"points":[{"x":1,"y":1,"t":9999}]}]`, "seed")
	require.NoError(t, err)
	current, err := repo.CurrentVersion(ctx)
	require.NoError(t, err)
	var stored []map[string]any
	require.NoError(t, json.Unmarshal([]byte(current.Strokes), &stored))
	assert.Len(t, stored, maxCanvasStrokes)
	// 最旧一笔已被裁:第一笔不再是 t=0,而是 t=1。
	first, ok := stored[0]["points"].([]any)
	require.True(t, ok)
	assert.Equal(t, float64(1), first[0].(map[string]any)["t"])
	// 最新一笔在最尾部。
	last, ok := stored[len(stored)-1]["points"].([]any)
	require.True(t, ok)
	assert.Equal(t, float64(9999), last[0].(map[string]any)["t"])
}

func TestCreateAndListDrawingSubmissions(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)
	ctx := context.Background()

	for _, status := range []string{"pending", "pending", "rejected"} {
		require.NoError(t, repo.CreateSubmission(ctx, &models.DrawingSubmission{BaseVersion: 1, Strokes: "[]", Status: status, CreatedBy: "octocat"}))
	}

	// status 过滤 + total 是过滤后计数。
	submissions, total, err := repo.ListSubmissions(ctx, "pending", 10)
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	require.Len(t, submissions, 2)
	assert.Equal(t, "pending", submissions[0].Status)

	// status 为空 → 不过滤。
	_, total, err = repo.ListSubmissions(ctx, "", 10)
	require.NoError(t, err)
	assert.Equal(t, int64(3), total)

	// GetSubmission 命中与未命中。
	got, err := repo.GetSubmission(ctx, submissions[0].ID)
	require.NoError(t, err)
	assert.Equal(t, "octocat", got.CreatedBy)
	_, err = repo.GetSubmission(ctx, 999)
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestUpdateSubmissionStatusSetsReviewerAndTime(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)
	ctx := context.Background()

	submission := models.DrawingSubmission{BaseVersion: 1, Strokes: "[]", Status: "pending", CreatedBy: "octocat"}
	require.NoError(t, repo.CreateSubmission(ctx, &submission))

	require.NoError(t, repo.UpdateSubmissionStatus(ctx, submission.ID, "approved", "admin", timeNowForTest()))
	got, err := repo.GetSubmission(ctx, submission.ID)
	require.NoError(t, err)
	assert.Equal(t, "approved", got.Status)
	assert.Equal(t, "admin", got.ReviewedBy)
	require.NotNil(t, got.ReviewedAt)
	assert.False(t, got.ReviewedAt.IsZero())
}

func timeNowForTest() time.Time { return time.Now() }

// repoStrokeJSON 仓库层并发测试用的最小合法笔画 JSON。
func repoStrokeJSON(id string) string {
	return `[{"id":"` + id + `","color":"#000","width":1,"points":[{"x":0.1,"y":0.1,"t":1}]}]`
}

// TestAppendStrokesConcurrentSameBaseExactlyOneWins 模拟两个请求持有同一 base
// 快照、先后抵达写入口:乐观锁以写入时刻的画布现值仲裁,恰一个发布,另一个
// 得 ErrDrawingVersionConflict,表里只有一行(旧实现读后写会双双发布)。
// 输家按现值重试(前端重拉重提语义)必须成功。
func TestAppendStrokesConcurrentSameBaseExactlyOneWins(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)
	ctx := context.Background()

	first, err := repo.AppendStrokes(ctx, 0, repoStrokeJSON("w1"), "octocat")
	require.NoError(t, err)
	assert.Equal(t, uint(1), first.Version)

	// 第二个请求仍拿着 base=0 写入:冲突,不落任何新行。
	_, err = repo.AppendStrokes(ctx, 0, repoStrokeJSON("w2"), "octocat")
	require.ErrorIs(t, err, ErrDrawingVersionConflict)

	var rows []models.DrawingVersion
	require.NoError(t, db.Order("version").Find(&rows).Error)
	require.Len(t, rows, 1, "并发同 base 只能发布一个")
	assert.Equal(t, uint(1), rows[0].Version)
	assert.Contains(t, rows[0].Strokes, `"id":"w1"`)
	assert.NotContains(t, rows[0].Strokes, `"id":"w2"`)

	// 输家重拉后重提 → 成功推进 v2。
	second, err := repo.AppendStrokes(ctx, 1, repoStrokeJSON("w2"), "octocat")
	require.NoError(t, err)
	assert.Equal(t, uint(2), second.Version)
}

// seedRepoSubmission 落一条指定 base 的 pending 投稿,返回带 ID 的记录。
func seedRepoSubmission(t *testing.T, db *gorm.DB, baseVersion uint) models.DrawingSubmission {
	t.Helper()
	submission := models.DrawingSubmission{BaseVersion: baseVersion, Strokes: repoStrokeJSON("sub1"), Status: "pending", CreatedBy: "octocat"}
	require.NoError(t, db.Create(&submission).Error)
	return submission
}

// TestApproveSubmissionPublishesAtomically base 相符:单事务内发布新版本并把
// 投稿推到 approved,返回记录带审核人/时间;画布恰好推进一版且含投稿笔画。
func TestApproveSubmissionPublishesAtomically(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)
	ctx := context.Background()

	_, err := repo.AppendStrokes(ctx, 0, repoStrokeJSON("base"), "seed")
	require.NoError(t, err)
	submission := seedRepoSubmission(t, db, 1)

	approved, err := repo.ApproveSubmission(ctx, submission.ID, 1, "admin")
	require.NoError(t, err)
	assert.Equal(t, "approved", approved.Status)
	assert.Equal(t, "admin", approved.ReviewedBy)
	require.NotNil(t, approved.ReviewedAt)

	current, err := repo.CurrentVersion(ctx)
	require.NoError(t, err)
	assert.Equal(t, uint(2), current.Version, "画布恰好推进一版")
	assert.Contains(t, current.Strokes, `"id":"sub1"`)
	assert.Equal(t, "octocat", current.CreatedBy, "新版本作者取投稿创建者")
}

// TestApproveSubmissionMarksSupersededWhenBaseBehind 画布已推进:投稿标
// superseded(带审核人)并返回 ErrDrawingBaseSuperseded,画布不落新行。
func TestApproveSubmissionMarksSupersededWhenBaseBehind(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)
	ctx := context.Background()

	_, err := repo.AppendStrokes(ctx, 0, repoStrokeJSON("base"), "seed")
	require.NoError(t, err)
	_, err = repo.AppendStrokes(ctx, 1, repoStrokeJSON("base2"), "seed")
	require.NoError(t, err)
	submission := seedRepoSubmission(t, db, 1)

	_, err = repo.ApproveSubmission(ctx, submission.ID, 1, "admin")
	require.ErrorIs(t, err, ErrDrawingBaseSuperseded)

	got, err := repo.GetSubmission(ctx, submission.ID)
	require.NoError(t, err)
	assert.Equal(t, "superseded", got.Status)
	assert.Equal(t, "admin", got.ReviewedBy)

	var count int64
	require.NoError(t, db.Model(&models.DrawingVersion{}).Count(&count).Error)
	assert.Equal(t, int64(2), count, "superseded 不落新版本行")
}

// TestApproveSubmissionTwiceConcurrentReviewLoses 顺序模拟并发双审核:第一个
// 成功后,第二个(仍持旧 pending 视图)必得 ErrDrawingSubmissionNotPending,
// 画布不重复推进;已拒投稿同样不可再审。
func TestApproveSubmissionTwiceConcurrentReviewLoses(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)
	ctx := context.Background()

	_, err := repo.AppendStrokes(ctx, 0, repoStrokeJSON("base"), "seed")
	require.NoError(t, err)
	submission := seedRepoSubmission(t, db, 1)

	_, err = repo.ApproveSubmission(ctx, submission.ID, 1, "admin")
	require.NoError(t, err)

	_, err = repo.ApproveSubmission(ctx, submission.ID, 1, "admin2")
	require.ErrorIs(t, err, ErrDrawingSubmissionNotPending)

	var count int64
	require.NoError(t, db.Model(&models.DrawingVersion{}).Count(&count).Error)
	assert.Equal(t, int64(2), count, "重复审核不重复发布")

	got, err := repo.GetSubmission(ctx, submission.ID)
	require.NoError(t, err)
	assert.Equal(t, "approved", got.Status, "第二次审核不改写第一条记录")

	// 已拒投稿同样不可 approve。
	rejected := models.DrawingSubmission{BaseVersion: 1, Strokes: repoStrokeJSON("sub2"), Status: "rejected", CreatedBy: "octocat"}
	require.NoError(t, db.Create(&rejected).Error)
	_, err = repo.ApproveSubmission(ctx, rejected.ID, 1, "admin")
	require.ErrorIs(t, err, ErrDrawingSubmissionNotPending)
}

// TestApproveSubmissionUnknownIDIsRecordNotFound 未知 id → gorm.ErrRecordNotFound,
// 路由层据此保持 404 契约。
func TestApproveSubmissionUnknownIDIsRecordNotFound(t *testing.T) {
	db := drawingRepoTestDB(t)
	repo := NewDrawingRepository(db)

	_, err := repo.ApproveSubmission(context.Background(), 999, 0, "admin")
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
}
