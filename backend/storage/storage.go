package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"path"
	"strings"
)

const SHA256MetadataKey = "sha256"

var ErrObjectSizeMismatch = errors.New("object size does not match declared size")

type ObjectInfo struct {
	Key         string
	Size        int64
	ContentType string
	Metadata    map[string]string
}

type MediaStorage interface {
	Save(ctx context.Context, key string, body io.ReadSeeker, size int64, contentType string, metadata map[string]string) error
	Delete(ctx context.Context, key string) error
	Head(ctx context.Context, key string) (ObjectInfo, error)
	PublicURL(key string) string
}

type ObjectLister interface {
	List(ctx context.Context, prefix string) ([]ObjectInfo, error)
}

func NormalizeObjectKey(key string) (string, error) {
	key = strings.TrimSpace(strings.ReplaceAll(key, "\\", "/"))
	if key == "" || strings.HasPrefix(key, "/") {
		return "", errors.New("invalid object key")
	}
	clean := path.Clean(key)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, "../") {
		return "", errors.New("invalid object key")
	}
	for _, segment := range strings.Split(key, "/") {
		if segment == "" || segment == "." || segment == ".." {
			return "", errors.New("invalid object key")
		}
	}
	return clean, nil
}

func validateBodySize(body io.ReadSeeker, size int64) error {
	if body == nil || size < 0 || size == math.MaxInt64 {
		return ErrObjectSizeMismatch
	}
	start, err := body.Seek(0, io.SeekCurrent)
	if err != nil {
		return fmt.Errorf("seek object body: %w", err)
	}
	actual, readErr := io.Copy(io.Discard, io.LimitReader(body, size+1))
	if _, err := body.Seek(start, io.SeekStart); err != nil {
		return fmt.Errorf("restore object body: %w", err)
	}
	if readErr != nil {
		return fmt.Errorf("read object body: %w", readErr)
	}
	if actual != size {
		return fmt.Errorf("%w: declared %d, actual %d", ErrObjectSizeMismatch, size, actual)
	}
	return nil
}
