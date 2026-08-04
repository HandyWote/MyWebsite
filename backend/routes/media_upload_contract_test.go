package routes

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/services"
	mediastorage "github.com/handywote/website/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mediaUploadResponse struct {
	Code int `json:"code"`
	Data struct {
		Filename string `json:"filename"`
		Key      string `json:"key"`
		URL      string `json:"url"`
	} `json:"data"`
}

func multipartUploadRequest(t *testing.T, target, filename string, payload []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", filename)
	require.NoError(t, err)
	_, err = part.Write(payload)
	require.NoError(t, err)
	require.NoError(t, writer.Close())
	request := httptest.NewRequest(http.MethodPost, target, &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	return request
}

func installTestMediaServices(t *testing.T, maxSize int64) {
	t.Helper()
	oldMedia := mediaService
	oldAvatar := avatarService
	driver := mediastorage.NewLocalStorage(t.TempDir(), "/uploads")
	mediaService = services.NewMediaStorageService(driver, nil, maxSize, []string{"jpg", "jpeg", "png", "webp"})
	require.NoError(t, database.GetDB().AutoMigrate(&models.Avatar{}, &models.MediaDeleteTask{}))
	require.NoError(t, database.GetDB().Where("1 = 1").Delete(&models.Avatar{}).Error)
	avatarService = services.NewAvatarService(repositories.NewAvatarRepository(), mediaService)
	t.Cleanup(func() {
		mediaService = oldMedia
		avatarService = oldAvatar
	})
}

func TestAvatarAndPDFUploadResponsesCanBeReadByFullKeyAndLegacyFilename(t *testing.T) {
	gin.SetMode(gin.TestMode)
	installTestMediaServices(t, 1<<20)
	router := gin.New()
	router.POST("/avatar", UploadAvatar)
	router.POST("/pdf", AdminUploadPdf)
	router.GET("/api/avatars/file/*key", GetAvatarFile)
	router.GET("/api/articles/pdf/*key", GetArticlePDF)

	avatarPayload := append([]byte{0xff, 0xd8, 0xff, 0xe0}, bytes.Repeat([]byte{0x11}, 32)...)
	avatarRecorder := httptest.NewRecorder()
	router.ServeHTTP(avatarRecorder, multipartUploadRequest(t, "/avatar", "avatar.jpg", avatarPayload))
	require.Equal(t, http.StatusOK, avatarRecorder.Code)
	var avatar mediaUploadResponse
	require.NoError(t, json.Unmarshal(avatarRecorder.Body.Bytes(), &avatar))
	assert.Contains(t, avatar.Data.Filename, "/")
	assert.Equal(t, "/uploads/"+avatar.Data.Filename, avatar.Data.URL)

	for _, key := range []string{avatar.Data.Filename, path.Base(avatar.Data.Filename)} {
		readRecorder := httptest.NewRecorder()
		router.ServeHTTP(readRecorder, httptest.NewRequest(http.MethodGet, "/api/avatars/file/"+key, nil))
		assert.Equal(t, http.StatusFound, readRecorder.Code)
		assert.Equal(t, avatar.Data.URL, readRecorder.Header().Get("Location"))
	}

	pdfPayload := []byte("%PDF-1.7\ncontract payload")
	pdfRecorder := httptest.NewRecorder()
	router.ServeHTTP(pdfRecorder, multipartUploadRequest(t, "/pdf", "article.pdf", pdfPayload))
	require.Equal(t, http.StatusOK, pdfRecorder.Code)
	var pdf mediaUploadResponse
	require.NoError(t, json.Unmarshal(pdfRecorder.Body.Bytes(), &pdf))
	assert.Contains(t, pdf.Data.Key, "/")
	assert.Equal(t, "/uploads/"+pdf.Data.Key, pdf.Data.URL)

	for _, key := range []string{pdf.Data.Key, path.Base(pdf.Data.Key)} {
		readRecorder := httptest.NewRecorder()
		router.ServeHTTP(readRecorder, httptest.NewRequest(http.MethodGet, "/api/articles/pdf/"+key, nil))
		assert.Equal(t, http.StatusFound, readRecorder.Code)
		assert.Equal(t, pdf.Data.URL, readRecorder.Header().Get("Location"))
	}
}

func TestUploadRoutesRejectDeclaredAndRequestBodyOverLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	installTestMediaServices(t, 16)
	router := gin.New()
	router.POST("/cover", AdminUploadCover)

	actualOverLimit := append([]byte{0xff, 0xd8, 0xff}, bytes.Repeat([]byte{0x22}, 14)...)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, multipartUploadRequest(t, "/cover", "cover.jpg", actualOverLimit))
	assert.Equal(t, http.StatusRequestEntityTooLarge, recorder.Code)

	requestOverLimit := append([]byte{0xff, 0xd8, 0xff}, bytes.Repeat([]byte{0x33}, int(mediaService.MaxRequestSize()))...)
	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, multipartUploadRequest(t, "/cover", "cover.jpg", requestOverLimit))
	assert.Equal(t, http.StatusRequestEntityTooLarge, recorder.Code)
}
