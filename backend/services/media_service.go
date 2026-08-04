package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"math"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path"
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

var ErrMediaTooLarge = errors.New("media exceeds size limit")

const multipartOverheadAllowance int64 = 1 << 20

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

func (s *MediaStorageService) Save(ctx context.Context, kind MediaKind, filename string, body io.Reader, declaredSize int64) (SavedMedia, error) {
	if s.storage == nil {
		return SavedMedia{}, errors.New("media storage is not configured")
	}
	if body == nil || declaredSize < 0 {
		return SavedMedia{}, fmt.Errorf("invalid media size")
	}
	if s.maxSize > 0 && declaredSize > s.maxSize {
		return SavedMedia{}, ErrMediaTooLarge
	}
	extension := strings.ToLower(strings.TrimPrefix(filepath.Ext(filepath.Base(filename)), "."))
	if err := s.validateExtension(kind, extension); err != nil {
		return SavedMedia{}, err
	}
	seekable, actualSize, cleanup, err := s.seekableBody(body, declaredSize)
	if err != nil {
		return SavedMedia{}, err
	}
	defer cleanup()
	if actualSize == 0 {
		return SavedMedia{}, errors.New("media is empty")
	}
	contentType, err := detectContentType(seekable)
	if err != nil {
		return SavedMedia{}, err
	}
	if err := validateDetectedType(kind, contentType); err != nil {
		return SavedMedia{}, err
	}
	key, err := mediaObjectKey(kind, extension)
	if err != nil {
		return SavedMedia{}, err
	}
	if err := s.storage.Save(ctx, key, seekable, actualSize, contentType, nil); err != nil {
		return SavedMedia{}, err
	}
	return SavedMedia{Key: key, URL: s.storage.PublicURL(key)}, nil
}

func (s *MediaStorageService) MaxRequestSize() int64 {
	if s.maxSize <= 0 || s.maxSize > math.MaxInt64-multipartOverheadAllowance {
		return s.maxSize
	}
	return s.maxSize + multipartOverheadAllowance
}

func (s *MediaStorageService) PDFURL(ctx context.Context, filename string) string {
	return s.legacyMediaURL(ctx, filename, "articles/pdfs/", "pdfs/")
}

func (s *MediaStorageService) AvatarURL(ctx context.Context, filename string) string {
	return s.legacyMediaURL(ctx, filename, "avatars/")
}

func (s *MediaStorageService) PublicURL(key string) string {
	key = strings.TrimSpace(key)
	if key == "" || s.storage == nil {
		return ""
	}
	if parsed, err := url.Parse(key); err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != "" {
		return key
	}
	if strings.HasPrefix(key, "/") {
		decoded, err := url.PathUnescape(key)
		if err != nil || strings.Contains(decoded, "\\") || path.Clean(decoded) != decoded {
			return ""
		}
		return key
	}
	normalized, err := storage.NormalizeObjectKey(key)
	if err != nil {
		return ""
	}
	return s.storage.PublicURL(normalized)
}

func (s *MediaStorageService) legacyMediaURL(ctx context.Context, filename string, prefixes ...string) string {
	filename = strings.TrimSpace(filename)
	if filename == "" {
		return ""
	}
	if direct := s.PublicURL(filename); strings.HasPrefix(filename, "http://") || strings.HasPrefix(filename, "https://") || strings.HasPrefix(filename, "/") {
		return direct
	}
	normalized, err := storage.NormalizeObjectKey(filepath.ToSlash(filename))
	if err != nil {
		return ""
	}
	for _, prefix := range prefixes {
		if strings.HasPrefix(normalized, prefix) {
			return s.PublicURL(normalized)
		}
	}
	base := path.Base(normalized)
	for _, prefix := range prefixes {
		candidate := prefix + base
		if _, err := s.storage.Head(ctx, candidate); err == nil {
			return s.PublicURL(candidate)
		}
	}
	return s.PublicURL(normalized)
}

func (s *MediaStorageService) seekableBody(body io.Reader, declaredSize int64) (io.ReadSeeker, int64, func(), error) {
	limit := s.maxSize
	if limit <= 0 {
		limit = declaredSize
	}
	if limit <= 0 || limit == math.MaxInt64 {
		return nil, 0, func() {}, errors.New("media size limit is not configured")
	}
	if seeker, ok := body.(io.ReadSeeker); ok {
		start, err := seeker.Seek(0, io.SeekCurrent)
		if err != nil {
			return nil, 0, func() {}, err
		}
		actual, readErr := io.Copy(io.Discard, io.LimitReader(seeker, limit+1))
		if _, err := seeker.Seek(start, io.SeekStart); err != nil {
			return nil, 0, func() {}, err
		}
		if readErr != nil {
			return nil, 0, func() {}, readErr
		}
		if actual > limit {
			return nil, 0, func() {}, ErrMediaTooLarge
		}
		return seeker, actual, func() {}, nil
	}
	temporary, err := os.CreateTemp("", "media-upload-*")
	if err != nil {
		return nil, 0, func() {}, err
	}
	cleanup := func() {
		temporary.Close()
		os.Remove(temporary.Name())
	}
	actual, err := io.Copy(temporary, io.LimitReader(body, limit+1))
	if err != nil {
		cleanup()
		return nil, 0, func() {}, err
	}
	if actual > limit {
		cleanup()
		return nil, 0, func() {}, ErrMediaTooLarge
	}
	if _, err := temporary.Seek(0, io.SeekStart); err != nil {
		cleanup()
		return nil, 0, func() {}, err
	}
	return temporary, actual, cleanup, nil
}

func detectContentType(body io.ReadSeeker) (string, error) {
	start, err := body.Seek(0, io.SeekCurrent)
	if err != nil {
		return "", fmt.Errorf("record media read position: %w", err)
	}
	header := make([]byte, 512)
	read, readErr := io.ReadFull(body, header)
	if readErr != nil && !errors.Is(readErr, io.EOF) && !errors.Is(readErr, io.ErrUnexpectedEOF) {
		return "", fmt.Errorf("read media header: %w", readErr)
	}
	if _, err := body.Seek(start, io.SeekStart); err != nil {
		return "", fmt.Errorf("restore media read position: %w", err)
	}
	contentType := http.DetectContentType(header[:read])
	return contentType, nil
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
	if interval <= 0 {
		interval = time.Minute
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		_ = s.RetryDeletes(ctx)
		select {
		case <-ctx.Done():
			return
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
