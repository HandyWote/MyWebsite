package services

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"gorm.io/gorm"
)

var (
	ErrArticleNotFound = errors.New("article not found")
	ErrInvalidArticle  = errors.New("invalid article")
)

var allowedArticleContentTypes = map[string]bool{
	"markdown": true,
	"pdf":      true,
}

type ArticleWriteInput struct {
	Title       *string `json:"title"`
	Category    *string `json:"category"`
	Tags        *string `json:"tags"`
	Cover       *string `json:"cover"`
	Summary     *string `json:"summary"`
	Content     *string `json:"content"`
	ContentType *string `json:"content_type"`
	PDFFilename *string `json:"pdf_filename"`
}

type MarkdownDocument struct {
	Filename string
	Content  string
}

type ArticleService struct {
	repository *repositories.ArticleRepository
	now        func() time.Time
}

func NewArticleService(repository ...*repositories.ArticleRepository) *ArticleService {
	repo := repositories.NewArticleRepository()
	if len(repository) > 0 && repository[0] != nil {
		repo = repository[0]
	}
	return &ArticleService{repository: repo, now: time.Now}
}

func (s *ArticleService) ListPublic(ctx context.Context, filter repositories.ArticleFilter) ([]models.Article, int64, error) {
	return s.repository.ListPublic(ctx, filter)
}

func (s *ArticleService) ListAdmin(ctx context.Context, filter repositories.ArticleFilter) ([]models.Article, int64, error) {
	return s.repository.ListAdmin(ctx, filter)
}

func (s *ArticleService) Get(ctx context.Context, id uint) (models.Article, error) {
	article, err := s.repository.FindByID(ctx, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Article{}, ErrArticleNotFound
	}
	return article, err
}

func (s *ArticleService) Create(ctx context.Context, input ArticleWriteInput) (models.Article, error) {
	article := articleFromInput(input)
	if article.ContentType == "" {
		article.ContentType = "markdown"
	}
	if err := validateArticle(article); err != nil {
		return models.Article{}, err
	}
	err := s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		if err := uow.Articles.Create(ctx, &article); err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "article", Action: "create", IDs: []uint{article.ID}}, s.now())
	})
	return article, err
}

func (s *ArticleService) Update(ctx context.Context, id uint, input ArticleWriteInput) (models.Article, error) {
	var updated models.Article
	err := s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		article, err := uow.Articles.FindByID(ctx, id)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrArticleNotFound
		}
		if err != nil {
			return err
		}
		fields := articleUpdateFields(input)
		merged := article
		applyArticleFields(&merged, fields)
		if err := validateArticle(merged); err != nil {
			return err
		}
		if len(fields) > 0 {
			if err := uow.Articles.Update(ctx, &article, fields); err != nil {
				return err
			}
		}
		updated, err = uow.Articles.FindByID(ctx, id)
		if err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "article", Action: "update", IDs: []uint{id}}, s.now())
	})
	return updated, err
}

func (s *ArticleService) Delete(ctx context.Context, id uint) error {
	return s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		if _, err := uow.Articles.FindByID(ctx, id); errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrArticleNotFound
		} else if err != nil {
			return err
		}
		if err := uow.Articles.Delete(ctx, id); err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "article", Action: "delete", IDs: []uint{id}}, s.now())
	})
}

func (s *ArticleService) BatchDelete(ctx context.Context, ids []uint) error {
	if len(ids) == 0 {
		return errors.New("article ids are required")
	}
	return s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		if err := uow.Articles.BatchDelete(ctx, ids); err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "article", Action: "batch", IDs: ids}, s.now())
	})
}

func (s *ArticleService) ImportMarkdown(ctx context.Context, documents []MarkdownDocument) ([]models.Article, error) {
	created := make([]models.Article, 0, len(documents))
	if len(documents) == 0 {
		return created, nil
	}
	err := s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		ids := make([]uint, 0, len(documents))
		for _, document := range documents {
			article := models.Article{
				Title: markdownTitle(document.Filename, document.Content), Content: document.Content, ContentType: "markdown",
			}
			if err := uow.Articles.Create(ctx, &article); err != nil {
				return err
			}
			created = append(created, article)
			ids = append(ids, article.ID)
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "article", Action: "import", IDs: ids}, s.now())
	})
	return created, err
}

func (s *ArticleService) All(ctx context.Context) ([]models.Article, error) {
	return s.repository.All(ctx)
}

func (s *ArticleService) Categories(ctx context.Context) ([]string, error) {
	return s.repository.DistinctCategories(ctx)
}

func (s *ArticleService) Tags(ctx context.Context) ([]string, error) {
	return s.repository.DistinctTags(ctx)
}

func articleFromInput(input ArticleWriteInput) models.Article {
	article := models.Article{}
	applyArticleFields(&article, articleUpdateFields(input))
	return article
}

func applyArticleFields(article *models.Article, fields map[string]interface{}) {
	if value, ok := fields["title"].(string); ok {
		article.Title = value
	}
	if value, ok := fields["category"].(string); ok {
		article.Category = value
	}
	if value, ok := fields["tags"].(string); ok {
		article.Tags = value
	}
	if value, ok := fields["cover"].(string); ok {
		article.Cover = value
	}
	if value, ok := fields["summary"].(string); ok {
		article.Summary = value
	}
	if value, ok := fields["content"].(string); ok {
		article.Content = value
	}
	if value, ok := fields["content_type"].(string); ok {
		article.ContentType = value
	}
	if value, ok := fields["pdf_filename"].(string); ok {
		article.PDFFilename = value
	}
}

func validateArticle(article models.Article) error {
	if strings.TrimSpace(article.Title) == "" || strings.TrimSpace(article.Content) == "" || strings.TrimSpace(article.ContentType) == "" {
		return fmt.Errorf("%w: title, content, and content_type are required", ErrInvalidArticle)
	}
	if !allowedArticleContentTypes[article.ContentType] {
		return fmt.Errorf("%w: unsupported content_type %q", ErrInvalidArticle, article.ContentType)
	}
	return nil
}

func articleUpdateFields(input ArticleWriteInput) map[string]interface{} {
	fields := make(map[string]interface{})
	if input.Title != nil {
		fields["title"] = *input.Title
	}
	if input.Category != nil {
		fields["category"] = *input.Category
	}
	if input.Tags != nil {
		fields["tags"] = *input.Tags
	}
	if input.Cover != nil {
		fields["cover"] = *input.Cover
	}
	if input.Summary != nil {
		fields["summary"] = *input.Summary
	}
	if input.Content != nil {
		fields["content"] = *input.Content
	}
	if input.ContentType != nil {
		fields["content_type"] = *input.ContentType
	}
	if input.PDFFilename != nil {
		fields["pdf_filename"] = *input.PDFFilename
	}
	return fields
}

func markdownTitle(filename, content string) string {
	title := strings.TrimSuffix(filepath.Base(filename), filepath.Ext(filename))
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			return strings.TrimSpace(strings.TrimPrefix(line, "# "))
		}
	}
	return title
}

func enqueueOutbox(ctx context.Context, repository *repositories.RevalidationOutboxRepository, event RevalidationEvent, now time.Time) error {
	record, err := NewOutboxRecord(event, now)
	if err != nil {
		return fmt.Errorf("build revalidation outbox record: %w", err)
	}
	if err := repository.Create(ctx, &record); err != nil {
		return fmt.Errorf("create revalidation outbox record: %w", err)
	}
	return nil
}
