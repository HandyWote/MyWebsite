package repositories

import (
	"context"
	"time"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

type CommentRepository struct {
	dbHolder
}

func NewCommentRepository(db ...*gorm.DB) *CommentRepository {
	var explicit *gorm.DB
	if len(db) > 0 {
		explicit = db[0]
	}
	return &CommentRepository{dbHolder{explicit: explicit}}
}

func (r *CommentRepository) ListByArticle(ctx context.Context, articleID uint) ([]models.Comment, error) {
	var comments []models.Comment
	err := r.db(ctx).Where("article_id = ? AND status = ?", articleID, "normal").Order("created_at DESC").Find(&comments).Error
	return comments, err
}

func (r *CommentRepository) CountRecentBy(ctx context.Context, field, value string, since time.Time) (int64, error) {
	var count int64
	err := r.db(ctx).Model(&models.Comment{}).Where(field+" = ? AND created_at > ?", value, since).Count(&count).Error
	return count, err
}

func (r *CommentRepository) Create(ctx context.Context, comment *models.Comment) error {
	return r.db(ctx).Create(comment).Error
}

func (r *CommentRepository) ListAdmin(ctx context.Context, status, search string, page, pageSize int) ([]models.Comment, int64, error) {
	query := commentFilter(r.db(ctx).Model(&models.Comment{}), status, search)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var comments []models.Comment
	err := query.Order("created_at DESC").Offset(offset(page, pageSize)).Limit(pageSize).Find(&comments).Error
	return comments, total, err
}

func (r *CommentRepository) Export(ctx context.Context, status, search string) ([]models.Comment, error) {
	var comments []models.Comment
	err := commentFilter(r.db(ctx).Model(&models.Comment{}), status, search).Order("created_at DESC").Find(&comments).Error
	return comments, err
}

func commentFilter(query *gorm.DB, status, search string) *gorm.DB {
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("LOWER(content) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?) OR LOWER(ip_address) LIKE LOWER(?)", like, like, like)
	}
	return query
}

func (r *CommentRepository) ListArticleTitles(ctx context.Context, articleIDs []uint) (map[uint]string, error) {
	titles := make(map[uint]string)
	if len(articleIDs) == 0 {
		return titles, nil
	}
	var articles []models.Article
	if err := r.db(ctx).Select("id,title").Where("id IN ?", articleIDs).Find(&articles).Error; err != nil {
		return nil, err
	}
	for _, article := range articles {
		titles[article.ID] = article.Title
	}
	return titles, nil
}

func (r *CommentRepository) UpdateStatus(ctx context.Context, id uint, status string) error {
	return r.db(ctx).Model(&models.Comment{}).Where("id = ?", id).Update("status", status).Error
}

func (r *CommentRepository) Delete(ctx context.Context, id uint) error {
	return r.db(ctx).Delete(&models.Comment{}, id).Error
}

func (r *CommentRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db(ctx).Model(&models.Comment{}).Count(&count).Error
	return count, err
}
