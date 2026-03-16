package utils

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSuccessResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	Success(c, "test data")

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestErrorBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	ErrorBadRequest(c, "bad request")

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestErrorUnauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	ErrorUnauthorized(c, "unauthorized")

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestErrorNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	ErrorNotFound(c, "not found")

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestErrorInternal(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	ErrorInternal(c, "internal error")

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
