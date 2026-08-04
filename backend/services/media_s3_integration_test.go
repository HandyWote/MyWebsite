package services

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/handywote/website/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMediaServiceUploadsDetectedBodyThroughRealS3HTTPClient(t *testing.T) {
	var mu sync.Mutex
	var uploadedPath string
	var uploadedBody []byte
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		mu.Lock()
		uploadedPath = r.URL.Path
		uploadedBody = body
		mu.Unlock()
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	driver, err := storage.NewS3Storage(context.Background(), storage.S3Config{
		Endpoint: server.URL, Region: "us-east-1", Bucket: "media-test",
		AccessKeyID: "test", SecretKey: "test", PublicBaseURL: "https://cdn.example/media", ForcePathStyle: true,
	})
	require.NoError(t, err)
	service := NewMediaStorageService(driver, nil, 1024, []string{"jpg", "jpeg"})
	payload := append([]byte{0xff, 0xd8, 0xff, 0xe0}, bytes.Repeat([]byte{0x42}, 64)...)

	// bytes.Buffer deliberately exercises the bounded non-seekable spool path.
	saved, err := service.Save(context.Background(), MediaAvatar, "avatar.jpg", bytes.NewBuffer(payload), int64(len(payload)))
	require.NoError(t, err)

	mu.Lock()
	path := uploadedPath
	body := append([]byte(nil), uploadedBody...)
	mu.Unlock()
	assert.True(t, strings.HasPrefix(path, "/media-test/avatars/"), path)
	assert.Equal(t, payload, body)
	assert.Equal(t, "https://cdn.example/media/"+saved.Key, saved.URL)
}
