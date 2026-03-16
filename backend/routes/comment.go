package routes

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// GetComments 获取文章评论
func GetComments(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid article ID")
		return
	}

	var comments []models.Comment
	if err := database.GetDB().Where("article_id = ? AND status = ?", id, "normal").
		Order("created_at DESC").Find(&comments).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch comments")
		return
	}

	utils.Success(c, gin.H{
		"comments": comments,
		"total":    len(comments),
	})
}

// CreateComment 创建评论
func CreateComment(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid article ID")
		return
	}

	var input struct {
		Author  string `json:"author" binding:"required"`
		Email   string `json:"email"`
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	cfg := config.LoadConfig()

	// 评论限制检查 - 按小时且按用户维度
	if cfg.CommentLimitEnabled {
		var count int64
		// 按小时计算时间窗口
		hoursAgo := time.Now().Add(-time.Duration(cfg.CommentLimitTimeWindow) * time.Hour)
		// 获取用户邮箱
		email := input.Email
		if email == "" {
			utils.ErrorBadRequest(c, "Email is required for comment")
			return
		}
		database.GetDB().Model(&models.Comment{}).
			Where("email = ? AND created_at > ?", email, hoursAgo).
			Count(&count)

		if count >= int64(cfg.CommentLimitMaxCount) {
			utils.ErrorForbidden(c, "评论次数已达上限，请稍后再试")
			return
		}
	}

	comment := models.Comment{
		ArticleID: uint(id),
		Author:    input.Author,
		Email:     input.Email,
		Content:   input.Content,
		Status:    "pending",
	}

	if err := database.GetDB().Create(&comment).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create comment")
		return
	}

	utils.Success(c, comment)
}
