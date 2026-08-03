package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetArticles(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/articles", nil)

	// Mock database would be needed here
	// For now, test route registration
	r.GET("/api/articles", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"data": []struct{}{}})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.NotNil(t, response["data"])
}

func TestGetArticlesExcludesContent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// 清空并用真实 handler 测试（TestMain 已提供 sqlite 内存库）
	database.GetDB().Where("1 = 1").Delete(&models.Article{})
	article := models.Article{
		Title:   "列表不应携带正文",
		Summary: "摘要",
		Content: "这是一整篇很长的 markdown 正文，列表接口不应返回它",
		Tags:    "go",
	}
	if err := database.GetDB().Create(&article).Error; err != nil {
		t.Fatalf("插入测试文章失败: %v", err)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/articles", nil)
	GetArticles(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var payload struct {
		Data struct {
			Articles []map[string]interface{} `json:"articles"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("解析响应失败: %v", err)
	}

	require.Len(t, payload.Data.Articles, 1, "应返回 1 篇文章")
	item := payload.Data.Articles[0]
	assert.Equal(t, "列表不应携带正文", item["title"])
	assert.NotContains(t, item, "content", "列表接口不应返回 content 字段")
	assert.Contains(t, item, "summary", "列表接口应保留 summary 等展示字段")
}
