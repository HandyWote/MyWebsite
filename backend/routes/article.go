package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// GetArticles 获取文章列表
func GetArticles(c *gin.Context) {
	var articles []models.Article
	page, pageSize := ParsePaginationParams(c)

	query := database.GetDB().Where("deleted_at IS NULL")

	// 应用搜索筛选
	if search := c.Query("search"); search != "" {
		query = query.Where("title ILIKE ? OR content ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// 应用分类筛选
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	// 应用标签筛选
	if tag := c.Query("tag"); tag != "" {
		query = query.Where("tags ILIKE ?", "%"+tag+"%")
	}

	query = query.Order("created_at DESC")

	var total int64
	// Count 需要使用 Model 指定模型，且在 Order 之前调用
	if err := query.Model(&models.Article{}).Count(&total).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch articles")
		return
	}

	query = query.Offset((page - 1) * pageSize).Limit(pageSize)

	if err := query.Find(&articles).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch articles")
		return
	}

	utils.Success(c, gin.H{
		"articles": articles,
		"pages":    (total + int64(pageSize) - 1) / int64(pageSize), // 总页数
		"total":    total,
		"page":     page,
	})
}

// GetArticle 获取单个文章
func GetArticle(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	var article models.Article
	if err := database.GetDB().Where("id = ? AND deleted_at IS NULL", id).First(&article).Error; err != nil {
		utils.ErrorNotFound(c, "Article not found")
		return
	}

	utils.Success(c, article)
}
