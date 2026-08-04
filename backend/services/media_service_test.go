package services

import (
	"errors"
	"io"
	"testing"

	"github.com/handywote/website/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type seekFailureReader struct {
	calls      int
	initialErr error
	restoreErr error
}

func (reader *seekFailureReader) Read(_ []byte) (int, error) { return 0, io.EOF }

func (reader *seekFailureReader) Seek(_ int64, _ int) (int64, error) {
	reader.calls++
	if reader.calls == 1 && reader.initialErr != nil {
		return 0, reader.initialErr
	}
	if reader.calls == 2 && reader.restoreErr != nil {
		return 0, reader.restoreErr
	}
	return 0, nil
}

func TestDetectContentTypeWrapsSeekFailures(t *testing.T) {
	initialErr := errors.New("initial seek failed")
	_, err := detectContentType(&seekFailureReader{initialErr: initialErr})
	require.Error(t, err)
	assert.ErrorIs(t, err, initialErr)
	assert.Contains(t, err.Error(), "record media read position")

	restoreErr := errors.New("restore seek failed")
	_, err = detectContentType(&seekFailureReader{restoreErr: restoreErr})
	require.Error(t, err)
	assert.ErrorIs(t, err, restoreErr)
	assert.Contains(t, err.Error(), "restore media read position")
}

func TestMediaPublicURLRejectsInvalidEscapedPath(t *testing.T) {
	service := NewMediaStorageService(storage.NewLocalStorage(t.TempDir(), "/uploads"), nil, 1024, nil)

	assert.Empty(t, service.PublicURL("/uploads/%zz"))
}
