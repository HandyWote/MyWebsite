package routes

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// AdminGetArticles 获取文章列表（管理）
func AdminGetArticles(c *gin.Context) {
	var articles []models.Article
	page, pageSize := ParsePaginationParams(c)

	query := database.GetDB().Model(&models.Article{}).Order("created_at DESC")

	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("title ILIKE ? OR summary ILIKE ? OR content ILIKE ?", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.ErrorInternal(c, "Failed to count articles: "+err.Error())
		return
	}

	query.Offset((page - 1) * pageSize).Limit(pageSize)

	if err := query.Find(&articles).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch articles")
		return
	}

	utils.Success(c, gin.H{
		"articles": articles,
		"total":    total,
		"page":     page,
	})
}

// AdminGetArticle 获取单个文章（管理）
func AdminGetArticle(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	var article models.Article
	if err := database.GetDB().First(&article, id).Error; err != nil {
		utils.ErrorNotFound(c, "Article not found")
		return
	}

	utils.Success(c, article)
}

// AdminCreateArticle 创建文章
func AdminCreateArticle(c *gin.Context) {
	var input struct {
		Title       string `json:"title" binding:"required"`
		Category    string `json:"category"`
		Tags        string `json:"tags"`
		Cover       string `json:"cover"`
		Summary     string `json:"summary"`
		Content     string `json:"content" binding:"required"`
		ContentType string `json:"content_type"`
		PDFFilename string `json:"pdf_filename"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	article := models.Article{
		Title:       input.Title,
		Category:    input.Category,
		Tags:        input.Tags,
		Cover:       input.Cover,
		Summary:     input.Summary,
		Content:     input.Content,
		ContentType: input.ContentType,
		PDFFilename: input.PDFFilename,
	}

	if err := database.GetDB().Create(&article).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create article")
		return
	}

	utils.Success(c, article)
}

// AdminUpdateArticle 更新文章
func AdminUpdateArticle(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	var article models.Article
	if err := database.GetDB().First(&article, id).Error; err != nil {
		utils.ErrorNotFound(c, "Article not found")
		return
	}

	var input struct {
		Title       string `json:"title"`
		Category    string `json:"category"`
		Tags        string `json:"tags"`
		Cover       string `json:"cover"`
		Summary     string `json:"summary"`
		Content     string `json:"content"`
		ContentType string `json:"content_type"`
		PDFFilename string `json:"pdf_filename"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	updates := make(map[string]interface{})
	if input.Title != "" {
		updates["title"] = input.Title
	}
	if input.Category != "" {
		updates["category"] = input.Category
	}
	if input.Tags != "" {
		updates["tags"] = input.Tags
	}
	if input.Cover != "" {
		updates["cover"] = input.Cover
	}
	if input.Summary != "" {
		updates["summary"] = input.Summary
	}
	if input.Content != "" {
		updates["content"] = input.Content
	}
	if input.ContentType != "" {
		updates["content_type"] = input.ContentType
	}
	if input.PDFFilename != "" {
		updates["pdf_filename"] = input.PDFFilename
	}

	if err := database.GetDB().Model(&article).Updates(updates).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update article")
		return
	}

	utils.Success(c, article)
}

// AdminDeleteArticle 删除文章
func AdminDeleteArticle(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	if err := database.GetDB().Delete(&models.Article{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete article")
		return
	}

	utils.Success(c, gin.H{"message": "Article deleted"})
}
