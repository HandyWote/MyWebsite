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

	v1, err := repo.AppendStrokes(ctx, `[{"id":"a","color":"#000","width":1,"points":[{"x":0,"y":0,"t":1}]}]`, "octocat")
	require.NoError(t, err)
	assert.Equal(t, uint(1), v1.Version)

	v2, err := repo.AppendStrokes(ctx, `[{"id":"b","color":"#111","width":0.5,"points":[{"x":1,"y":1,"t":2}]}]`, "octocat")
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
	v1, err := repo.AppendStrokes(ctx, string(seeded), "seed")
	require.NoError(t, err)
	assert.Equal(t, uint(1), v1.Version)

	// 再追加 1 笔 → 总数超上限,最旧的被裁掉,长度封顶。
	_, err = repo.AppendStrokes(ctx, `[{"id":"new","color":"#000","width":1,"points":[{"x":1,"y":1,"t":9999}]}]`, "seed")
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
