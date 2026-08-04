package storage

import (
	"context"
	"errors"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
)

type LocalStorage struct {
	root       string
	publicBase string
}

func NewLocalStorage(root, publicBase string) *LocalStorage {
	if publicBase == "" {
		publicBase = "/uploads"
	}
	return &LocalStorage{root: root, publicBase: strings.TrimRight(publicBase, "/")}
}

func (s *LocalStorage) Save(_ context.Context, key string, body io.Reader, _ int64, _ string) error {
	filename, err := s.objectPath(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(filename), 0o755); err != nil {
		return err
	}
	temporary, err := os.CreateTemp(filepath.Dir(filename), ".upload-*")
	if err != nil {
		return err
	}
	temporaryName := temporary.Name()
	defer os.Remove(temporaryName)
	if _, err := io.Copy(temporary, body); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	return os.Rename(temporaryName, filename)
}

func (s *LocalStorage) Delete(_ context.Context, key string) error {
	filename, err := s.objectPath(key)
	if err != nil {
		return err
	}
	err = os.Remove(filename)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}

func (s *LocalStorage) Head(_ context.Context, key string) (ObjectInfo, error) {
	filename, err := s.objectPath(key)
	if err != nil {
		return ObjectInfo{}, err
	}
	info, err := os.Stat(filename)
	if err != nil {
		return ObjectInfo{}, err
	}
	return ObjectInfo{Key: key, Size: info.Size(), ContentType: mime.TypeByExtension(filepath.Ext(key))}, nil
}

func (s *LocalStorage) PublicURL(key string) string {
	return s.publicBase + "/" + strings.TrimLeft(filepath.ToSlash(key), "/")
}

func (s *LocalStorage) List(_ context.Context, prefix string) ([]ObjectInfo, error) {
	objects := make([]ObjectInfo, 0)
	root := s.root
	err := filepath.WalkDir(root, func(filename string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		relative, err := filepath.Rel(root, filename)
		if err != nil {
			return err
		}
		key := filepath.ToSlash(relative)
		if !strings.HasPrefix(key, prefix) {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		objects = append(objects, ObjectInfo{Key: key, Size: info.Size(), ContentType: mime.TypeByExtension(filepath.Ext(key))})
		return nil
	})
	if errors.Is(err, os.ErrNotExist) {
		return objects, nil
	}
	return objects, err
}

func (s *LocalStorage) objectPath(key string) (string, error) {
	clean := filepath.Clean(filepath.FromSlash(key))
	if clean == "." || filepath.IsAbs(clean) || clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", errors.New("invalid object key")
	}
	return filepath.Join(s.root, clean), nil
}
