package storage

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLocalStorageRejectsActualBytesBeyondDeclaredSize(t *testing.T) {
	driver := NewLocalStorage(t.TempDir(), "/uploads")
	err := driver.Save(context.Background(), "articles/assets/file.bin", bytes.NewReader([]byte("12345")), 4, "application/octet-stream", nil)
	assert.ErrorIs(t, err, ErrObjectSizeMismatch)
	_, headErr := driver.Head(context.Background(), "articles/assets/file.bin")
	assert.Error(t, headErr)
}

func TestS3StorageValidatesActualBytesBeforeSendingRequest(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	driver, err := NewS3Storage(context.Background(), S3Config{
		Endpoint: server.URL, Region: "us-east-1", Bucket: "media-test",
		AccessKeyID: "test", SecretKey: "test", ForcePathStyle: true,
	})
	require.NoError(t, err)

	err = driver.Save(context.Background(), "articles/assets/file.bin", bytes.NewReader([]byte("12345")), 4, "application/octet-stream", nil)
	assert.ErrorIs(t, err, ErrObjectSizeMismatch)
	assert.Zero(t, requests.Load())
}

func TestStorageRejectsTraversalKeysAndURLs(t *testing.T) {
	driver := NewLocalStorage(t.TempDir(), "/uploads")
	assert.Empty(t, driver.PublicURL("../secret.txt"))
	assert.Empty(t, driver.PublicURL("articles/../secret.txt"))
	err := driver.Save(context.Background(), "../secret.txt", bytes.NewReader([]byte("x")), 1, "text/plain", nil)
	assert.Error(t, err)
}
