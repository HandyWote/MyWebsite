package storage

import (
	"context"
	"io"
)

type ObjectInfo struct {
	Key         string
	Size        int64
	ContentType string
	Metadata    map[string]string
}

type MediaStorage interface {
	Save(ctx context.Context, key string, body io.Reader, size int64, contentType string) error
	Delete(ctx context.Context, key string) error
	Head(ctx context.Context, key string) (ObjectInfo, error)
	PublicURL(key string) string
}

type ObjectLister interface {
	List(ctx context.Context, prefix string) ([]ObjectInfo, error)
}
