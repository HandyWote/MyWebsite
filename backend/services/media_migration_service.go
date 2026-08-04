package services

import (
	"context"
	"errors"
	"fmt"
	"mime"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/handywote/website/repositories"
	"github.com/handywote/website/storage"
)

type MediaMigrationMode string

const (
	MediaMigrationDryRun MediaMigrationMode = "dry-run"
	MediaMigrationApply  MediaMigrationMode = "apply"
	MediaMigrationVerify MediaMigrationMode = "verify"
)

type MediaMigrationItem struct {
	Source string `json:"source"`
	Key    string `json:"key"`
	Size   int64  `json:"size"`
	Status string `json:"status"`
}

type MediaMigrationResult struct {
	Mode      MediaMigrationMode   `json:"mode"`
	Items     []MediaMigrationItem `json:"items"`
	Uploaded  int                  `json:"uploaded"`
	Skipped   int                  `json:"skipped"`
	Validated int                  `json:"validated"`
}

type mediaReference struct {
	kind string
	id   uint
	old  string
}

type mediaMigrationPlan struct {
	item     MediaMigrationItem
	refs     []mediaReference
	typeName string
	missing  bool
}

type MediaMigrationService struct {
	root     string
	storage  storage.MediaStorage
	articles *repositories.ArticleRepository
	avatars  *repositories.AvatarRepository
	now      func() time.Time
}

func NewMediaMigrationService(root string, driver storage.MediaStorage, articles *repositories.ArticleRepository, avatars *repositories.AvatarRepository) *MediaMigrationService {
	if articles == nil {
		articles = repositories.NewArticleRepository()
	}
	if avatars == nil {
		avatars = repositories.NewAvatarRepository()
	}
	return &MediaMigrationService{root: root, storage: driver, articles: articles, avatars: avatars, now: time.Now}
}

func (s *MediaMigrationService) Run(ctx context.Context, mode MediaMigrationMode) (MediaMigrationResult, error) {
	if mode != MediaMigrationDryRun && mode != MediaMigrationApply && mode != MediaMigrationVerify {
		return MediaMigrationResult{}, fmt.Errorf("unsupported migration mode %q", mode)
	}
	plans, err := s.plan(ctx)
	if err != nil {
		return MediaMigrationResult{}, err
	}
	result := MediaMigrationResult{Mode: mode, Items: make([]MediaMigrationItem, 0, len(plans))}
	for _, plan := range plans {
		if plan.item.Status == "conflict" {
			result.Items = append(result.Items, plan.item)
			return result, fmt.Errorf("media conflict for %s", plan.item.Key)
		}
	}
	for index := range plans {
		plan := &plans[index]
		switch mode {
		case MediaMigrationDryRun:
			if plan.missing {
				plan.item.Status = "would-upload"
			} else {
				plan.item.Status = "skip"
				result.Skipped++
			}
		case MediaMigrationApply:
			if plan.missing {
				file, err := os.Open(plan.item.Source)
				if err != nil {
					return result, err
				}
				err = s.storage.Save(ctx, plan.item.Key, file, plan.item.Size, plan.typeName)
				file.Close()
				if err != nil {
					return result, fmt.Errorf("upload %s: %w", plan.item.Key, err)
				}
				if err := s.validateTarget(ctx, plan.item.Key, plan.item.Size, plan.typeName); err != nil {
					return result, err
				}
				plan.item.Status = "uploaded"
				result.Uploaded++
			} else {
				plan.item.Status = "skip"
				result.Skipped++
			}
			if err := s.updateReferences(ctx, plan.item.Key, plan.refs); err != nil {
				return result, err
			}
		case MediaMigrationVerify:
			if err := s.validateTarget(ctx, plan.item.Key, plan.item.Size, plan.typeName); err != nil {
				return result, err
			}
			if err := verifyReferences(plan.item.Key, plan.refs); err != nil {
				return result, err
			}
			plan.item.Status = "valid"
			result.Validated++
		}
		result.Items = append(result.Items, plan.item)
	}
	return result, nil
}

func (s *MediaMigrationService) plan(ctx context.Context) ([]mediaMigrationPlan, error) {
	articles, err := s.articles.All(ctx)
	if err != nil {
		return nil, err
	}
	avatars, err := s.avatars.List(ctx)
	if err != nil {
		return nil, err
	}
	avatarRefs := make(map[string][]mediaReference)
	coverRefs := make(map[string][]mediaReference)
	pdfRefs := make(map[string][]mediaReference)
	for _, avatar := range avatars {
		base := filepath.Base(filepath.FromSlash(avatar.Filename))
		avatarRefs[base] = append(avatarRefs[base], mediaReference{kind: "avatar", id: avatar.ID, old: avatar.Filename})
	}
	for _, article := range articles {
		if article.Cover != "" {
			base := filepath.Base(filepath.FromSlash(article.Cover))
			coverRefs[base] = append(coverRefs[base], mediaReference{kind: "cover", id: article.ID, old: article.Cover})
		}
		if article.PDFFilename != "" {
			base := filepath.Base(filepath.FromSlash(article.PDFFilename))
			pdfRefs[base] = append(pdfRefs[base], mediaReference{kind: "pdf", id: article.ID, old: article.PDFFilename})
		}
	}
	plans := make([]mediaMigrationPlan, 0)
	keys := make(map[string]string)
	err = filepath.WalkDir(s.root, func(filename string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
		relative, err := filepath.Rel(s.root, filename)
		if err != nil {
			return err
		}
		relative = filepath.ToSlash(relative)
		base := filepath.Base(relative)
		key := "articles/assets/" + relative
		refs := []mediaReference(nil)
		switch {
		case len(avatarRefs[base]) > 0:
			key, refs = "avatars/"+base, avatarRefs[base]
		case len(pdfRefs[base]) > 0 || strings.HasPrefix(relative, "pdfs/"):
			key, refs = "articles/pdfs/"+base, pdfRefs[base]
		case len(coverRefs[base]) > 0:
			key, refs = "articles/covers/"+base, coverRefs[base]
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		contentType := mime.TypeByExtension(filepath.Ext(base))
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		plan := mediaMigrationPlan{item: MediaMigrationItem{Source: filename, Key: key, Size: info.Size()}, refs: refs, typeName: contentType}
		if previous, exists := keys[key]; exists && previous != filename {
			plan.item.Status = "conflict"
			plans = append(plans, plan)
			return nil
		}
		keys[key] = filename
		head, headErr := s.storage.Head(ctx, key)
		if isObjectMissing(headErr) {
			plan.missing = true
		} else if headErr != nil {
			return headErr
		} else if head.Size != info.Size() || (head.ContentType != "" && contentType != "" && head.ContentType != contentType) {
			plan.item.Status = "conflict"
		}
		plans = append(plans, plan)
		return nil
	})
	if errors.Is(err, os.ErrNotExist) {
		return plans, nil
	}
	sort.Slice(plans, func(i, j int) bool { return plans[i].item.Key < plans[j].item.Key })
	return plans, err
}

func (s *MediaMigrationService) validateTarget(ctx context.Context, key string, size int64, contentType string) error {
	info, err := s.storage.Head(ctx, key)
	if err != nil {
		return fmt.Errorf("head %s: %w", key, err)
	}
	if info.Size != size || (info.ContentType != "" && contentType != "" && info.ContentType != contentType) {
		return fmt.Errorf("media validation failed for %s", key)
	}
	return nil
}

func (s *MediaMigrationService) updateReferences(ctx context.Context, key string, refs []mediaReference) error {
	return s.articles.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		articleIDs := make([]uint, 0)
		avatarIDs := make([]uint, 0)
		for _, ref := range refs {
			if ref.old == key {
				continue
			}
			switch ref.kind {
			case "avatar":
				if err := uow.Avatars.UpdateKey(ctx, ref.id, key); err != nil {
					return err
				}
				avatarIDs = append(avatarIDs, ref.id)
			case "cover":
				if err := uow.Articles.UpdateCoverKey(ctx, ref.id, key); err != nil {
					return err
				}
				articleIDs = append(articleIDs, ref.id)
			case "pdf":
				if err := uow.Articles.UpdatePDFKey(ctx, ref.id, key); err != nil {
					return err
				}
				articleIDs = append(articleIDs, ref.id)
			}
		}
		if len(articleIDs) > 0 {
			if err := enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "article", Action: "update", IDs: articleIDs}, s.now()); err != nil {
				return err
			}
		}
		if len(avatarIDs) > 0 {
			if err := enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "avatar", Action: "update", IDs: avatarIDs}, s.now()); err != nil {
				return err
			}
		}
		return nil
	})
}

func verifyReferences(key string, refs []mediaReference) error {
	for _, ref := range refs {
		if ref.old != key {
			return fmt.Errorf("database reference %s:%d still points to %s", ref.kind, ref.id, ref.old)
		}
	}
	return nil
}

func isObjectMissing(err error) bool {
	return errors.Is(err, os.ErrNotExist) || storage.IsNotFound(err)
}

func (s *MediaMigrationService) Orphans(ctx context.Context, prefix string) ([]storage.ObjectInfo, error) {
	lister, ok := s.storage.(storage.ObjectLister)
	if !ok {
		return nil, errors.New("storage does not support listing")
	}
	objects, err := lister.List(ctx, prefix)
	if err != nil {
		return nil, err
	}
	articles, err := s.articles.All(ctx)
	if err != nil {
		return nil, err
	}
	avatars, err := s.avatars.List(ctx)
	if err != nil {
		return nil, err
	}
	known := make(map[string]bool)
	for _, article := range articles {
		known[article.Cover] = true
		known[article.PDFFilename] = true
	}
	for _, avatar := range avatars {
		known[avatar.Filename] = true
	}
	orphans := make([]storage.ObjectInfo, 0)
	for _, object := range objects {
		if !known[object.Key] {
			orphans = append(orphans, object)
		}
	}
	return orphans, nil
}
