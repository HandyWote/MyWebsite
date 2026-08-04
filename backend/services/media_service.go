package services

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/handywote/website/repositories"
	"github.com/handywote/website/storage"
)

type MediaKind string

const (
	MediaAvatar MediaKind = "avatar"
	MediaCover  MediaKind = "cover"
	MediaPDF    MediaKind = "pdf"
	MediaAsset  MediaKind = "asset"
)

type SavedMedia struct {
	Key string `json:"key"`
	URL string `json:"url"`
}

type MediaStorageService struct {
	storage     storage.MediaStorage
	deletions   *repositories.MediaDeleteRepository
	maxSize     int64
	allowedExts map[string]bool
	now         func() time.Time
}

func NewMediaStorageService(driver storage.MediaStorage, deletions *repositories.MediaDeleteRepository, maxSize int64, allowedExtensions []string) *MediaStorageService {
	allowed := make(map[string]bool, len(allowedExtensions))
	for _, extension := range allowedExtensions {
		allowed[strings.ToLower(strings.TrimPrefix(extension, "."))] = true
	}
	if deletions == nil {
		deletions = repositories.NewMediaDeleteRepository()
	}
	return &MediaStorageService{storage: driver, deletions: deletions, maxSize: maxSize, allowedExts: allowed, now: time.Now}
}

func (s *MediaStorageService) Save(ctx context.Context, kind MediaKind, filename string, body io.Reader, size int64) (SavedMedia, error) {
	if s.storage == nil {
		return SavedMedia{}, errors.New("media storage is not configured")
	}
	if size <= 0 || (s.maxSize > 0 && size > s.maxSize) {
		return SavedMedia{}, fmt.Errorf("invalid media size")
	}
	extension := strings.ToLower(strings.TrimPrefix(filepath.Ext(filepath.Base(filename)), "."))
	if err := s.validateExtension(kind, extension); err != nil {
		return SavedMedia{}, err
	}
	buffered := bufio.NewReader(body)
	header, err := buffered.Peek(512)
	if err != nil && !errors.Is(err, io.EOF) {
		return SavedMedia{}, err
	}
	contentType := http.DetectContentType(header)
	if err := validateDetectedType(kind, contentType); err != nil {
		return SavedMedia{}, err
	}
	key, err := mediaObjectKey(kind, extension)
	if err != nil {
		return SavedMedia{}, err
	}
	if err := s.storage.Save(ctx, key, buffered, size, contentType); err != nil {
		return SavedMedia{}, err
	}
	return SavedMedia{Key: key, URL: s.storage.PublicURL(key)}, nil
}

func (s *MediaStorageService) PDFURL(ctx context.Context, filename string) string {
	if strings.TrimSpace(filename) == "" { return "" }
	key := strings.TrimLeft(filepath.ToSlash(filename), "/")
	if strings.HasPrefix(key, "articles/pdfs/") { return s.PublicURL(key) }
	for _, candidate := range []string{"articles/pdfs/" + filepath.Base(key), "pdfs/" + filepath.Base(key)} {
		if _, err := s.storage.Head(ctx, candidate); err == nil { return s.PublicURL(candidate) }
	}
	return s.PublicURL(key)
}

func (s *MediaStorageService) PublicURL(key string) string {
	if key == "" || s.storage == nil {
		return ""
	}
	if strings.HasPrefix(key, "http://") || strings.HasPrefix(key, "https://") || strings.HasPrefix(key, "/") {
		return key
	}
	return s.storage.PublicURL(key)
}

func (s *MediaStorageService) Delete(ctx context.Context, key string) error {
	if key == "" {
		return nil
	}
	if err := s.storage.Delete(ctx, key); err != nil {
		if enqueueErr := s.deletions.Enqueue(ctx, key, err.Error(), s.now()); enqueueErr != nil {
			return fmt.Errorf("delete media: %v; enqueue retry: %w", err, enqueueErr)
		}
		return err
	}
	return nil
}

func (s *MediaStorageService) RunDeleteWorker(ctx context.Context, interval time.Duration) {
	if interval <= 0 { interval = time.Minute }
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		_ = s.RetryDeletes(ctx)
		select {
		case <-ctx.Done(): return
		case <-ticker.C:
		}
	}
}

func (s *MediaStorageService) RetryDeletes(ctx context.Context) error {
	tasks, err := s.deletions.FindDue(ctx, s.now(), 25)
	if err != nil {
		return err
	}
	for _, task := range tasks {
		if err := s.storage.Delete(ctx, task.ObjectKey); err != nil {
			attempts := task.Attempts + 1
			if markErr := s.deletions.MarkFailed(ctx, task.ID, attempts, s.now().Add(retryDelay(attempts)), err.Error()); markErr != nil {
				return markErr
			}
			continue
		}
		if err := s.deletions.MarkProcessed(ctx, task.ID, s.now()); err != nil {
			return err
		}
	}
	return nil
}

func (s *MediaStorageService) validateExtension(kind MediaKind, extension string) error {
	switch kind {
	case MediaPDF:
		if extension != "pdf" {
			return errors.New("only PDF files are allowed")
		}
	case MediaAvatar, MediaCover:
		if !s.allowedExts[extension] {
			return errors.New("unsupported image extension")
		}
	case MediaAsset:
		if extension == "" {
			return errors.New("asset extension is required")
		}
	default:
		return errors.New("unsupported media kind")
	}
	return nil
}

func validateDetectedType(kind MediaKind, contentType string) error {
	mediaType, _, _ := mime.ParseMediaType(contentType)
	if kind == MediaPDF && mediaType != "application/pdf" {
		return errors.New("file content is not PDF")
	}
	if (kind == MediaAvatar || kind == MediaCover) && !strings.HasPrefix(mediaType, "image/") {
		return errors.New("file content is not an image")
	}
	return nil
}

func mediaObjectKey(kind MediaKind, extension string) (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	identifier := hex.EncodeToString(bytes)
	switch kind {
	case MediaAvatar:
		return "avatars/" + identifier + "." + extension, nil
	case MediaCover:
		return "articles/covers/" + identifier + "." + extension, nil
	case MediaPDF:
		return "articles/pdfs/" + identifier + ".pdf", nil
	case MediaAsset:
		return "articles/assets/" + identifier + "." + extension, nil
	default:
		return "", errors.New("unsupported media kind")
	}
}
