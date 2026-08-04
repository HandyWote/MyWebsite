package storage

import (
	"context"
	"fmt"

	"github.com/handywote/website/config"
)

func NewFromConfig(ctx context.Context, cfg *config.Config) (MediaStorage, error) {
	switch cfg.StorageDriver {
	case "", "local":
		return NewLocalStorage(cfg.UploadFolder, "/uploads"), nil
	case "s3":
		return NewS3Storage(ctx, S3Config{
			Endpoint: cfg.S3Endpoint, Region: cfg.S3Region, Bucket: cfg.S3Bucket,
			AccessKeyID: cfg.S3AccessKeyID, SecretKey: cfg.S3SecretKey,
			PublicBaseURL: cfg.S3PublicBaseURL, ForcePathStyle: cfg.S3ForcePathStyle,
		})
	default:
		return nil, fmt.Errorf("unsupported storage driver %q", cfg.StorageDriver)
	}
}
