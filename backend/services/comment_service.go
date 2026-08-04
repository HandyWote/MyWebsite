package services

import (
	"context"
	"time"

	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
)

// CommentService owns public and admin comment operations.
type CommentService struct {
	repository *repositories.CommentRepository
}

func NewCommentService(repository ...*repositories.CommentRepository) *CommentService {
	repo := repositories.NewCommentRepository()
	if len(repository) > 0 && repository[0] != nil {
		repo = repository[0]
	}
	return &CommentService{repository: repo}
}

func (s *CommentService) ListByArticle(articleID uint) ([]models.Comment, error) {
	return s.repository.ListByArticle(context.Background(), articleID)
}

func (s *CommentService) CountRecentBy(field, value string, since time.Time) (int64, error) {
	return s.repository.CountRecentBy(context.Background(), field, value, since)
}

func (s *CommentService) Create(comment *models.Comment) error {
	return s.repository.Create(context.Background(), comment)
}

func (s *CommentService) ListAdmin(status, search string, page, pageSize int) ([]models.Comment, int64, error) {
	return s.repository.ListAdmin(context.Background(), status, search, page, pageSize)
}

func (s *CommentService) Export(ctx context.Context, status, search string) ([]models.Comment, error) {
	return s.repository.Export(ctx, status, search)
}

func (s *CommentService) ListArticleTitles(articleIDs []uint) (map[uint]string, error) {
	return s.repository.ListArticleTitles(context.Background(), articleIDs)
}

func (s *CommentService) UpdateStatus(id uint, status string) error {
	return s.repository.UpdateStatus(context.Background(), id, status)
}

func (s *CommentService) Delete(id uint) error {
	return s.repository.Delete(context.Background(), id)
}

func (s *CommentService) Count(ctx context.Context) (int64, error) {
	return s.repository.Count(ctx)
}
