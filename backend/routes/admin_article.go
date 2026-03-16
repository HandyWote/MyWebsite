package routes

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// AdminGetArticles 获取文章列表（管理）
func AdminGetArticles(c *gin.Context) {
	var articles []models.Article
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	query := database.GetDB().Order("created_at DESC")

	var total int64
	query.Count(&total)

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

// AdminGetComments 获取评论列表（管理）
func AdminGetComments(c *gin.Context) {
	var comments []models.Comment
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	query := database.GetDB().Order("created_at DESC")

	var total int64
	query.Count(&total)

	query.Offset((page - 1) * pageSize).Limit(pageSize)

	if err := query.Find(&comments).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch comments")
		return
	}

	utils.Success(c, gin.H{
		"comments": comments,
		"total":    total,
		"page":     page,
	})
}

// AdminUpdateComment 更新评论状态
func AdminUpdateComment(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	var input struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	if err := database.GetDB().Model(&models.Comment{}).Where("id = ?", id).Update("status", input.Status).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update comment")
		return
	}

	utils.Success(c, gin.H{"message": "Comment updated"})
}

// AdminDeleteComment 删除评论
func AdminDeleteComment(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	if err := database.GetDB().Delete(&models.Comment{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete comment")
		return
	}

	utils.Success(c, gin.H{"message": "Comment deleted"})
}

// AdminGetSkills 获取技能列表（管理）
func AdminGetSkills(c *gin.Context) {
	var skills []models.Skill
	if err := database.GetDB().Order("level DESC").Find(&skills).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch skills")
		return
	}

	utils.Success(c, skills)
}

// AdminCreateSkill 创建技能
func AdminCreateSkill(c *gin.Context) {
	var input struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Level       int    `json:"level"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	skill := models.Skill{
		Name:        input.Name,
		Description: input.Description,
		Level:       input.Level,
	}

	if err := database.GetDB().Create(&skill).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create skill")
		return
	}

	utils.Success(c, skill)
}

// AdminUpdateSkill 更新技能
func AdminUpdateSkill(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Level       int    `json:"level"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	updates := make(map[string]interface{})
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}
	if input.Level > 0 {
		updates["level"] = input.Level
	}

	if err := database.GetDB().Model(&models.Skill{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update skill")
		return
	}

	utils.Success(c, gin.H{"message": "Skill updated"})
}

// AdminDeleteSkill 删除技能
func AdminDeleteSkill(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	if err := database.GetDB().Delete(&models.Skill{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete skill")
		return
	}

	utils.Success(c, gin.H{"message": "Skill deleted"})
}

// AdminGetContacts 获取联系方式列表（管理）
func AdminGetContacts(c *gin.Context) {
	var contacts []models.Contact
	if err := database.GetDB().Find(&contacts).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch contacts")
		return
	}

	utils.Success(c, contacts)
}

// AdminCreateContact 创建联系方式
func AdminCreateContact(c *gin.Context) {
	var input struct {
		Type  string `json:"type" binding:"required"`
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	contact := models.Contact{
		Type:  input.Type,
		Value: input.Value,
	}

	if err := database.GetDB().Create(&contact).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create contact")
		return
	}

	utils.Success(c, contact)
}

// AdminUpdateContact 更新联系方式
func AdminUpdateContact(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	var input struct {
		Type  string `json:"type"`
		Value string `json:"value"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	updates := make(map[string]interface{})
	if input.Type != "" {
		updates["type"] = input.Type
	}
	if input.Value != "" {
		updates["value"] = input.Value
	}

	if err := database.GetDB().Model(&models.Contact{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update contact")
		return
	}

	utils.Success(c, gin.H{"message": "Contact updated"})
}

// AdminDeleteContact 删除联系方式
func AdminDeleteContact(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	if err := database.GetDB().Delete(&models.Contact{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete contact")
		return
	}

	utils.Success(c, gin.H{"message": "Contact deleted"})
}

// AdminGetSiteBlocks 获取内容块列表（管理）
func AdminGetSiteBlocks(c *gin.Context) {
	var blocks []models.SiteBlock
	if err := database.GetDB().Find(&blocks).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch site blocks")
		return
	}

	utils.Success(c, blocks)
}

// AdminUpdateSiteBlock 更新内容块
func AdminUpdateSiteBlock(c *gin.Context) {
	name := c.Param("name")

	var input struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	var block models.SiteBlock
	result := database.GetDB().Where("name = ?", name).First(&block)

	if result.Error != nil {
		// 不存在则创建
		block = models.SiteBlock{
			Name:    name,
			Content: input.Content,
		}
		if err := database.GetDB().Create(&block).Error; err != nil {
			utils.ErrorInternal(c, "Failed to create site block")
			return
		}
	} else {
		// 存在则更新
		if err := database.GetDB().Model(&block).Update("content", input.Content).Error; err != nil {
			utils.ErrorInternal(c, "Failed to update site block")
			return
		}
	}

	utils.Success(c, block)
}

// AdminDeleteSiteBlock 删除内容块
func AdminDeleteSiteBlock(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	if err := database.GetDB().Delete(&models.SiteBlock{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete site block")
		return
	}

	utils.Success(c, gin.H{"message": "Site block deleted"})
}
