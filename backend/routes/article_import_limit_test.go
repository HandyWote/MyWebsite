package routes

import (
	"bytes"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadMarkdownAcceptsEightMiBBoundaryAndRejectsLimitPlusOne(t *testing.T) {
	atLimit := bytes.Repeat([]byte("a"), int(maxMarkdownImportSize))
	content, err := readMarkdown(bytes.NewReader(atLimit))
	require.NoError(t, err)
	assert.Len(t, content, int(maxMarkdownImportSize))

	overLimit := bytes.Repeat([]byte("a"), int(maxMarkdownImportSize+1))
	content, err = readMarkdown(bytes.NewReader(overLimit))
	assert.Nil(t, content)
	assert.True(t, errors.Is(err, errMarkdownTooLarge))
}

func TestAdminImportMarkdownReturns413ForEightMiBPlusOne(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/import", AdminImportMarkdown)
	payload := bytes.Repeat([]byte("a"), int(maxMarkdownImportSize+1))
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, multipartUploadRequest(t, "/import", "large.md", payload))

	assert.Equal(t, http.StatusRequestEntityTooLarge, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "413")
}
