package services

import (
	"log"
	"os"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestMain(m *testing.M) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatalf("初始化 sqlite 内存测试库失败: %v", err)
	}
	if err := db.AutoMigrate(&models.Comment{}, &models.Article{}); err != nil {
		log.Fatalf("sqlite AutoMigrate 失败: %v", err)
	}
	database.DB = db

	code := m.Run()
	os.Exit(code)
}

func TestCommentService_CreateAndListByArticle(t *testing.T) {
	database.GetDB().Where("1 = 1").Delete(&models.Comment{})
	svc := NewCommentService()

	// 普通评论
	normal := models.Comment{ArticleID: 1, Author: "alice", Content: "hello", Status: "normal"}
	// pending 评论（不应出现在公开列表）
	pending := models.Comment{ArticleID: 1, Author: "bob", Content: "moderating", Status: "pending"}
	require.NoError(t, svc.Create(&normal))
	require.NoError(t, svc.Create(&pending))

	comments, err := svc.ListByArticle(1)
	require.NoError(t, err)
	assert.Len(t, comments, 1, "公开列表只应包含 normal 评论")
	assert.Equal(t, "alice", comments[0].Author)
}

func TestCommentService_CountRecentBy(t *testing.T) {
	database.GetDB().Where("1 = 1").Delete(&models.Comment{})
	svc := NewCommentService()

	require.NoError(t, svc.Create(&models.Comment{ArticleID: 1, Author: "x", Email: "a@b.c", Content: "1", Status: "normal"}))
	require.NoError(t, svc.Create(&models.Comment{ArticleID: 1, Author: "x", Email: "a@b.c", Content: "2", Status: "normal"}))

	count, err := svc.CountRecentBy("email", "a@b.c", time.Now().Add(-time.Hour))
	require.NoError(t, err)
	assert.Equal(t, int64(2), count)

	// 窗口外不计入
	count, err = svc.CountRecentBy("email", "a@b.c", time.Now().Add(time.Hour))
	require.NoError(t, err)
	assert.Equal(t, int64(0), count)
}

func TestCommentService_AdminListAndStatus(t *testing.T) {
	database.GetDB().Where("1 = 1").Delete(&models.Comment{})
	svc := NewCommentService()

	require.NoError(t, svc.Create(&models.Comment{ArticleID: 1, Author: "alice", Content: "spam text", Status: "pending"}))
	require.NoError(t, svc.Create(&models.Comment{ArticleID: 1, Author: "bob", Content: "clean", Status: "normal"}))

	// status 过滤
	comments, total, err := svc.ListAdmin("pending", "", 1, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, comments, 1)
	assert.Equal(t, "spam text", comments[0].Content)

	// search 过滤
	comments, total, err = svc.ListAdmin("", "spam", 1, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Equal(t, "alice", comments[0].Author)

	// 更新状态
	require.NoError(t, svc.UpdateStatus(comments[0].ID, "spam"))
	updated, _, _ := svc.ListAdmin("spam", "", 1, 10)
	assert.Len(t, updated, 1)

	// 删除
	require.NoError(t, svc.Delete(updated[0].ID))
	after, _, _ := svc.ListAdmin("", "", 1, 10)
	assert.Len(t, after, 1, "删除后只剩 1 条")
}

func TestCommentService_ListArticleTitles(t *testing.T) {
	database.GetDB().Where("1 = 1").Delete(&models.Article{})
	article := models.Article{Title: "评论服务测试文章"}
	require.NoError(t, database.GetDB().Create(&article).Error)

	svc := NewCommentService()
	titles, err := svc.ListArticleTitles([]uint{article.ID, 99999})
	require.NoError(t, err)
	assert.Equal(t, "评论服务测试文章", titles[article.ID])
	_, exists := titles[99999]
	assert.False(t, exists, "不存在的文章不应出现在标题映射中")
}
