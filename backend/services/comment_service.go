package services

import (
	"time"

	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

// CommentService 评论领域服务：所有评论相关 DB 访问的唯一入口。
// handler 只做参数校验、HTTP 决策与 DTO 拼装。
type CommentService struct {
	db *gorm.DB
}

func NewCommentService() *CommentService {
	return &CommentService{db: database.GetDB()}
}

// ListByArticle 获取文章下的公开评论（status=normal）
func (s *CommentService) ListByArticle(articleID uint) ([]models.Comment, error) {
	var comments []models.Comment
	if err := s.db.Where("article_id = ? AND status = ?", articleID, "normal").
		Order("created_at DESC").Find(&comments).Error; err != nil {
		return nil, err
	}
	return comments, nil
}

// CountRecentBy 统计时间窗口内的评论数（按 email/ip/author 维度限流）
func (s *CommentService) CountRecentBy(field, value string, since time.Time) (int64, error) {
	var count int64
	err := s.db.Model(&models.Comment{}).
		Where(field+" = ? AND created_at > ?", value, since).
		Count(&count).Error
	return count, err
}

// Create 创建评论
func (s *CommentService) Create(comment *models.Comment) error {
	return s.db.Create(comment).Error
}

// ListAdmin 管理后台分页查询评论（支持 status/search 过滤），返回列表与总数
func (s *CommentService) ListAdmin(status, search string, page, pageSize int) ([]models.Comment, int64, error) {
	query := s.db.Model(&models.Comment{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		like := "%" + search + "%"
		// 用 LOWER()+LIKE 兼容 Postgres 与 sqlite（测试库），语义与 ILIKE 等价（大小写不敏感）
		query = query.Where("LOWER(content) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?) OR LOWER(ip_address) LIKE LOWER(?)", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var comments []models.Comment
	if err := query.Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&comments).Error; err != nil {
		return nil, 0, err
	}
	return comments, total, nil
}

// ListArticleTitles 批量取文章标题（用于评论列表展示）
func (s *CommentService) ListArticleTitles(articleIDs []uint) (map[uint]string, error) {
	titles := make(map[uint]string)
	if len(articleIDs) == 0 {
		return titles, nil
	}
	var articles []models.Article
	if err := s.db.Select("id,title").Where("id IN ?", articleIDs).Find(&articles).Error; err != nil {
		return nil, err
	}
	for _, article := range articles {
		titles[article.ID] = article.Title
	}
	return titles, nil
}

// UpdateStatus 更新评论状态
func (s *CommentService) UpdateStatus(id uint, status string) error {
	return s.db.Model(&models.Comment{}).Where("id = ?", id).Update("status", status).Error
}

// Delete 删除评论
func (s *CommentService) Delete(id uint) error {
	return s.db.Delete(&models.Comment{}, id).Error
}
