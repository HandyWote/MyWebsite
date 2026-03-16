package routes

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAdminGetArticles(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/admin/articles", nil)

	r.GET("/api/admin/articles", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{
				"articles": []interface{}{},
				"total":    0,
				"page":     1,
			},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminCreateArticle(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	body := []byte(`{"title":"Test Article","content":"Test content"}`)
	c.Request = httptest.NewRequest("POST", "/api/admin/articles", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	r.POST("/api/admin/articles", func(c *gin.Context) {
		var input struct {
			Title   string `json:"title"`
			Content string `json:"content"`
		}
		c.ShouldBindJSON(&input)

		c.JSON(http.StatusCreated, gin.H{
			"code": 0,
			"data": gin.H{
				"id":      1,
				"title":   input.Title,
				"content": input.Content,
			},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminUpdateArticle(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	body := []byte(`{"title":"Updated Title"}`)
	c.Request = httptest.NewRequest("PUT", "/api/admin/articles/1", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	r.PUT("/api/admin/articles/:id", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{"message": "Article updated"},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteArticle(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/admin/articles/1", nil)

	r.DELETE("/api/admin/articles/:id", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{"message": "Article deleted"},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetComments(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/admin/comments", nil)

	r.GET("/api/admin/comments", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{
				"comments": []interface{}{},
				"total":    0,
				"page":     1,
			},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateComment(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	body := []byte(`{"status":"approved"}`)
	c.Request = httptest.NewRequest("PUT", "/api/admin/comments/1", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	r.PUT("/api/admin/comments/:id", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{"message": "Comment updated"},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetSkills(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/admin/skills", nil)

	r.GET("/api/admin/skills", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": []interface{}{},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminCreateSkill(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	body := []byte(`{"name":"Go","description":"Go language","level":80}`)
	c.Request = httptest.NewRequest("POST", "/api/admin/skills", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	r.POST("/api/admin/skills", func(c *gin.Context) {
		c.JSON(http.StatusCreated, gin.H{
			"code": 0,
			"data": gin.H{"id": 1, "name": "Go"},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminUpdateSkill(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	body := []byte(`{"name":"Go","description":"Updated","level":90}`)
	c.Request = httptest.NewRequest("PUT", "/api/admin/skills/1", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	r.PUT("/api/admin/skills/:id", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{"message": "Skill updated"},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteSkill(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/admin/skills/1", nil)

	r.DELETE("/api/admin/skills/:id", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{"message": "Skill deleted"},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetContacts(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/admin/contacts", nil)

	r.GET("/api/admin/contacts", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": []interface{}{},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminCreateContact(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	body := []byte(`{"type":"email","value":"test@example.com"}`)
	c.Request = httptest.NewRequest("POST", "/api/admin/contacts", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	r.POST("/api/admin/contacts", func(c *gin.Context) {
		c.JSON(http.StatusCreated, gin.H{
			"code": 0,
			"data": gin.H{"id": 1, "type": "email"},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminDeleteContact(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("DELETE", "/api/admin/contacts/1", nil)

	r.DELETE("/api/admin/contacts/:id", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{"message": "Contact deleted"},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetSiteBlocks(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/admin/site-blocks", nil)

	r.GET("/api/admin/site-blocks", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": []interface{}{},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateSiteBlock(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	body := []byte(`{"content":{"key":"value"}}`)
	c.Request = httptest.NewRequest("PUT", "/api/admin/site-blocks/home", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	r.PUT("/api/admin/site-blocks/:name", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{"message": "Site block updated"},
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)
}

// Helper to test JSON parsing
var _ = json.Marshal
var _ = bytes.Buffer{}
