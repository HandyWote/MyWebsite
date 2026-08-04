package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func corsTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORS("http://localhost:3000", "https://admin.example.com"))
	router.GET("/test", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	return router
}

func TestCORSAllowsConfiguredOrigin(t *testing.T) {
	router := corsTestRouter()
	request := httptest.NewRequest(http.MethodOptions, "/test", nil)
	request.Header.Set("Origin", "http://localhost:3000")
	request.Header.Set("Access-Control-Request-Method", http.MethodGet)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	assert.Equal(t, http.StatusNoContent, response.Code)
	assert.Equal(t, "http://localhost:3000", response.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", response.Header().Get("Access-Control-Allow-Credentials"))
	assert.Equal(t, "Content-Type,Content-Length,Accept-Encoding,X-Requested-With,Authorization", response.Header().Get("Access-Control-Allow-Headers"))
}

func TestCORSRejectsUnknownPreflightOrigin(t *testing.T) {
	request := httptest.NewRequest(http.MethodOptions, "/test", nil)
	request.Header.Set("Origin", "https://attacker.example")
	response := httptest.NewRecorder()
	corsTestRouter().ServeHTTP(response, request)

	assert.Equal(t, http.StatusForbidden, response.Code)
	assert.Empty(t, response.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORSSameOriginRequestNeedsNoHeader(t *testing.T) {
	response := httptest.NewRecorder()
	corsTestRouter().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/test", nil))

	assert.Equal(t, http.StatusOK, response.Code)
	assert.Empty(t, response.Header().Get("Access-Control-Allow-Origin"))
}
