package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type S3Config struct {
	Endpoint       string
	Region         string
	Bucket         string
	AccessKeyID    string
	SecretKey      string
	PublicBaseURL  string
	ForcePathStyle bool
}

type s3API interface {
	PutObject(context.Context, *s3.PutObjectInput, ...func(*s3.Options)) (*s3.PutObjectOutput, error)
	DeleteObject(context.Context, *s3.DeleteObjectInput, ...func(*s3.Options)) (*s3.DeleteObjectOutput, error)
	HeadObject(context.Context, *s3.HeadObjectInput, ...func(*s3.Options)) (*s3.HeadObjectOutput, error)
	ListObjectsV2(context.Context, *s3.ListObjectsV2Input, ...func(*s3.Options)) (*s3.ListObjectsV2Output, error)
}

type S3Storage struct {
	client     s3API
	bucket     string
	publicBase string
}

func NewS3Storage(ctx context.Context, cfg S3Config) (*S3Storage, error) {
	if strings.TrimSpace(cfg.Bucket) == "" {
		return nil, fmt.Errorf("S3_BUCKET is required")
	}
	loadOptions := []func(*awsconfig.LoadOptions) error{awsconfig.WithRegion(cfg.Region)}
	if cfg.AccessKeyID != "" || cfg.SecretKey != "" {
		loadOptions = append(loadOptions, awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretKey, "")))
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, loadOptions...)
	if err != nil {
		return nil, err
	}
	client := s3.NewFromConfig(awsCfg, func(options *s3.Options) {
		options.UsePathStyle = cfg.ForcePathStyle
		if cfg.Endpoint != "" {
			options.BaseEndpoint = aws.String(strings.TrimRight(cfg.Endpoint, "/"))
		}
	})
	publicBase := strings.TrimRight(cfg.PublicBaseURL, "/")
	if publicBase == "" && cfg.Endpoint != "" {
		publicBase = strings.TrimRight(cfg.Endpoint, "/") + "/" + cfg.Bucket
	}
	return &S3Storage{client: client, bucket: cfg.Bucket, publicBase: publicBase}, nil
}

func newS3StorageWithClient(client s3API, bucket, publicBase string) *S3Storage {
	return &S3Storage{client: client, bucket: bucket, publicBase: strings.TrimRight(publicBase, "/")}
}

func (s *S3Storage) Save(ctx context.Context, key string, body io.ReadSeeker, size int64, contentType string, metadata map[string]string) error {
	normalized, err := NormalizeObjectKey(key)
	if err != nil {
		return err
	}
	if err := validateBodySize(body, size); err != nil {
		return err
	}
	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket), Key: aws.String(normalized), Body: body, ContentLength: aws.Int64(size),
		ContentType: aws.String(contentType), Metadata: metadata,
	})
	return err
}

func (s *S3Storage) Delete(ctx context.Context, key string) error {
	normalized, err := NormalizeObjectKey(key)
	if err != nil {
		return err
	}
	_, err = s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(normalized)})
	return err
}

func (s *S3Storage) Head(ctx context.Context, key string) (ObjectInfo, error) {
	normalized, err := NormalizeObjectKey(key)
	if err != nil {
		return ObjectInfo{}, err
	}
	output, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(normalized)})
	if err != nil {
		return ObjectInfo{}, err
	}
	return ObjectInfo{Key: normalized, Size: aws.ToInt64(output.ContentLength), ContentType: aws.ToString(output.ContentType), Metadata: output.Metadata}, nil
}

func (s *S3Storage) PublicURL(key string) string {
	normalized, err := NormalizeObjectKey(key)
	if err != nil {
		return ""
	}
	return s.publicBase + "/" + escapeObjectKey(normalized)
}

func (s *S3Storage) List(ctx context.Context, prefix string) ([]ObjectInfo, error) {
	objects := make([]ObjectInfo, 0)
	var continuation *string
	for {
		output, err := s.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket: aws.String(s.bucket), Prefix: aws.String(prefix), ContinuationToken: continuation,
		})
		if err != nil {
			return nil, err
		}
		for _, object := range output.Contents {
			objects = append(objects, ObjectInfo{Key: aws.ToString(object.Key), Size: aws.ToInt64(object.Size)})
		}
		if !aws.ToBool(output.IsTruncated) {
			break
		}
		continuation = output.NextContinuationToken
	}
	return objects, nil
}

func escapeObjectKey(key string) string {
	parts := strings.Split(strings.TrimLeft(key, "/"), "/")
	for index, part := range parts {
		parts[index] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}

func IsNotFound(err error) bool {
	if err == nil {
		return false
	}
	var notFound *types.NotFound
	text := strings.ToLower(err.Error())
	return errors.As(err, &notFound) || strings.Contains(text, "notfound") || strings.Contains(text, "status code: 404")
}
