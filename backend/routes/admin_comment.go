package routes

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// AdminGetComments 获取评论列表（管理）
func AdminGetComments(c *gin.Context) {
	var comments []models.Comment
	page, pageSize := ParsePaginationParams(c)

	query := database.GetDB().Model(&models.Comment{})

	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("content ILIKE ? OR author ILIKE ? OR ip_address ILIKE ?", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.ErrorInternal(c, "Failed to count comments: "+err.Error())
		return
	}

	query = query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize)

	if err := query.Find(&comments).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch comments")
		return
	}

	articleIDs := make([]uint, 0)
	articleIDSet := make(map[uint]struct{})
	for _, cmt := range comments {
		if _, exists := articleIDSet[cmt.ArticleID]; !exists {
			articleIDSet[cmt.ArticleID] = struct{}{}
			articleIDs = append(articleIDs, cmt.ArticleID)
		}
	}

	articleTitleByID := make(map[uint]string)
	if len(articleIDs) > 0 {
		var articles []models.Article
		if err := database.GetDB().Select("id,title").Where("id IN ?", articleIDs).Find(&articles).Error; err == nil {
			for _, article := range articles {
				articleTitleByID[article.ID] = article.Title
			}
		}
	}

	commentItems := make([]gin.H, 0, len(comments))
	for _, cmt := range comments {
		commentItems = append(commentItems, gin.H{
			"id":           cmt.ID,
			"article_id":  cmt.ArticleID,
			"article_title": func() string {
				if t, ok := articleTitleByID[cmt.ArticleID]; ok {
					return t
				}
				return "未知文章"
			}(),
			"author":     cmt.Author,
			"email":      cmt.Email,
			"content":    cmt.Content,
			"ip_address": cmt.IPAddress,
			"user_agent": cmt.UserAgent,
			"status":     cmt.Status,
			"created_at": cmt.CreatedAt,
			"updated_at": cmt.UpdatedAt,
		})
	}

	utils.Success(c, gin.H{
		"comments": commentItems,
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
