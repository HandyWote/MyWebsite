package storage

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestS3StorageContractWithCustomPathStyleEndpoint(t *testing.T) {
	var mu sync.Mutex
	objects := make(map[string][]byte)
	contentTypes := make(map[string]string)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := r.URL.Path
		mu.Lock()
		defer mu.Unlock()
		switch r.Method {
		case http.MethodPut:
			body, _ := io.ReadAll(r.Body)
			objects[key] = body
			contentTypes[key] = r.Header.Get("Content-Type")
			w.WriteHeader(http.StatusOK)
		case http.MethodHead:
			body, ok := objects[key]
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Length", strconv.Itoa(len(body)))
			w.Header().Set("Content-Type", contentTypes[key])
			w.WriteHeader(http.StatusOK)
		case http.MethodDelete:
			delete(objects, key)
			w.WriteHeader(http.StatusNoContent)
		default:
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()

	driver, err := NewS3Storage(context.Background(), S3Config{
		Endpoint: server.URL, Region: "us-east-1", Bucket: "media-test",
		AccessKeyID: "test", SecretKey: "test", PublicBaseURL: "https://cdn.example/media", ForcePathStyle: true,
	})
	require.NoError(t, err)

	body := []byte("pdf payload")
	require.NoError(t, driver.Save(context.Background(), "articles/pdfs/a.pdf", bytes.NewReader(body), int64(len(body)), "application/pdf"))
	info, err := driver.Head(context.Background(), "articles/pdfs/a.pdf")
	require.NoError(t, err)
	assert.Equal(t, int64(len(body)), info.Size)
	assert.Equal(t, "application/pdf", info.ContentType)
	assert.Equal(t, "https://cdn.example/media/articles/pdfs/a.pdf", driver.PublicURL("articles/pdfs/a.pdf"))

	require.NoError(t, driver.Delete(context.Background(), "articles/pdfs/a.pdf"))
	_, err = driver.Head(context.Background(), "articles/pdfs/a.pdf")
	assert.True(t, IsNotFound(err))
}
