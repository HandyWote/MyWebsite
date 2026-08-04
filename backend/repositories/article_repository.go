package repositories

import (
	"context"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

type ArticleFilter struct {
	Search   string
	Category string
	Tag      string
	Page     int
	PageSize int
}

type ArticleRepository struct {
	dbHolder
}

func NewArticleRepository(db ...*gorm.DB) *ArticleRepository {
	var explicit *gorm.DB
	if len(db) > 0 {
		explicit = db[0]
	}
	return &ArticleRepository{dbHolder{explicit: explicit}}
}

func (r *ArticleRepository) Transaction(ctx context.Context, fn func(*UnitOfWork) error) error {
	return r.transaction(ctx, fn)
}

func (r *ArticleRepository) ListPublic(ctx context.Context, filter ArticleFilter) ([]models.Article, int64, error) {
	query := r.db(ctx).Model(&models.Article{})
	query = applyArticleFilters(query, filter, false)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var articles []models.Article
	err := query.Select("id, title, category, tags, cover, summary, content_type, pdf_filename, created_at, updated_at").
		Order("created_at DESC").Offset(offset(filter.Page, filter.PageSize)).Limit(filter.PageSize).Find(&articles).Error
	return articles, total, err
}

func (r *ArticleRepository) ListAdmin(ctx context.Context, filter ArticleFilter) ([]models.Article, int64, error) {
	query := applyArticleFilters(r.db(ctx).Model(&models.Article{}), filter, true)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var articles []models.Article
	err := query.Order("created_at DESC").Offset(offset(filter.Page, filter.PageSize)).Limit(filter.PageSize).Find(&articles).Error
	return articles, total, err
}

func applyArticleFilters(query *gorm.DB, filter ArticleFilter, includeSummary bool) *gorm.DB {
	if filter.Search != "" {
		like := "%" + filter.Search + "%"
		if includeSummary {
			query = query.Where("LOWER(title) LIKE LOWER(?) OR LOWER(summary) LIKE LOWER(?) OR LOWER(content) LIKE LOWER(?)", like, like, like)
		} else {
			query = query.Where("LOWER(title) LIKE LOWER(?) OR LOWER(content) LIKE LOWER(?)", like, like)
		}
	}
	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	}
	if filter.Tag != "" {
		query = query.Where("LOWER(tags) LIKE LOWER(?)", "%"+filter.Tag+"%")
	}
	return query
}

func offset(page, pageSize int) int {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	return (page - 1) * pageSize
}

func (r *ArticleRepository) FindByID(ctx context.Context, id uint) (models.Article, error) {
	var article models.Article
	err := r.db(ctx).First(&article, id).Error
	return article, err
}

func (r *ArticleRepository) Create(ctx context.Context, article *models.Article) error {
	return r.db(ctx).Create(article).Error
}

func (r *ArticleRepository) Update(ctx context.Context, article *models.Article, fields map[string]interface{}) error {
	return r.db(ctx).Model(article).Updates(fields).Error
}

func (r *ArticleRepository) Delete(ctx context.Context, id uint) error {
	return r.db(ctx).Delete(&models.Article{}, id).Error
}

func (r *ArticleRepository) BatchDelete(ctx context.Context, ids []uint) error {
	return r.db(ctx).Delete(&models.Article{}, ids).Error
}

func (r *ArticleRepository) All(ctx context.Context) ([]models.Article, error) {
	var articles []models.Article
	err := r.db(ctx).Order("created_at DESC").Find(&articles).Error
	return articles, err
}

func (r *ArticleRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db(ctx).Model(&models.Article{}).Count(&count).Error
	return count, err
}

func (r *ArticleRepository) DistinctCategories(ctx context.Context) ([]string, error) {
	var values []string
	err := r.db(ctx).Model(&models.Article{}).Distinct("category").Pluck("category", &values).Error
	return values, err
}

func (r *ArticleRepository) DistinctTags(ctx context.Context) ([]string, error) {
	var values []string
	err := r.db(ctx).Model(&models.Article{}).Distinct("tags").Pluck("tags", &values).Error
	return values, err
}

func (r *ArticleRepository) UpdateCoverKey(ctx context.Context, id uint, key string) error {
	return r.db(ctx).Model(&models.Article{}).Where("id = ?", id).Update("cover", key).Error
}

func (r *ArticleRepository) UpdatePDFKey(ctx context.Context, id uint, key string) error {
	return r.db(ctx).Model(&models.Article{}).Where("id = ?", id).Update("pdf_filename", key).Error
}
