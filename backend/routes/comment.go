package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// GetComments 获取文章评论
func GetComments(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
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
	id, valid := ParseUintParam(c, "id")
	if !valid {
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
	identityEmail := strings.TrimSpace(input.Email)
	identityIP := strings.TrimSpace(c.ClientIP())
	identifier := buildCommentLimiterIdentity(identityEmail, identityIP)

	// 评论限制检查 - 按小时且按用户维度
	if cfg.CommentLimitEnabled {
		var count int64
		// 按小时计算时间窗口
		hoursAgo := time.Now().Add(-time.Duration(cfg.CommentLimitTimeWindow) * time.Hour)
		limitQuery := database.GetDB().Model(&models.Comment{})
		if identityEmail != "" {
			limitQuery = limitQuery.Where("email = ? AND created_at > ?", identityEmail, hoursAgo)
		} else if identityIP != "" {
			limitQuery = limitQuery.Where("ip_address = ? AND created_at > ?", identityIP, hoursAgo)
		} else {
			limitQuery = limitQuery.Where("author = ? AND created_at > ?", identifier, hoursAgo)
		}
		limitQuery.Count(&count)

		if count >= int64(cfg.CommentLimitMaxCount) {
			c.JSON(http.StatusTooManyRequests, utils.Response{
				Code:    http.StatusTooManyRequests,
				Message: "评论次数已达上限，请稍后再试",
			})
			return
		}
	}

	comment := models.Comment{
		ArticleID: id,
		Author:    input.Author,
		Email:     input.Email,
		Content:   input.Content,
		IPAddress: identityIP,
		UserAgent: c.GetHeader("User-Agent"),
		Status:    "pending",
	}

	if err := database.GetDB().Create(&comment).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create comment")
		return
	}

	utils.Success(c, comment)
}

func buildCommentLimiterIdentity(email, ip string) string {
	if email != "" {
		return email
	}
	if ip != "" {
		return ip
	}
	return "anonymous"
}
