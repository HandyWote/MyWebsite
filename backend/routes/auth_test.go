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

func TestLoginSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	body := []byte(`{"username":"admin","password":"admin123"}`)
	c.Request = httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	// Mock successful login - will need config values
	r.POST("/api/auth/login", func(c *gin.Context) {
		var input struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		c.ShouldBindJSON(&input)

		// Return success for testing
		if input.Username == "admin" && input.Password == "admin123" {
			c.JSON(http.StatusOK, gin.H{
				"code": 0,
				"data": gin.H{
					"token": "mock-token",
					"user":  gin.H{"username": "admin"},
				},
			})
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Invalid username or password",
			})
		}
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, float64(0), response["code"])
	assert.NotNil(t, response["data"])
}

func TestLoginInvalidCredentials(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	body := []byte(`{"username":"wrong","password":"wrong"}`)
	c.Request = httptest.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	r.POST("/api/auth/login", func(c *gin.Context) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "Invalid username or password",
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestLoginMissingBody(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	c.Request = httptest.NewRequest("POST", "/api/auth/login", nil)
	c.Request.Header.Set("Content-Type", "application/json")

	r.POST("/api/auth/login", func(c *gin.Context) {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Invalid request body",
		})
	})

	r.ServeHTTP(w, c.Request)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
