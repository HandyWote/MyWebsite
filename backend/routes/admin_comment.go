package routes

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

// AdminGetComments 获取评论列表（管理）
func AdminGetComments(c *gin.Context) {
	page, pageSize := ParsePaginationParams(c)

	status := strings.TrimSpace(c.Query("status"))
	search := strings.TrimSpace(c.Query("search"))

	commentService := services.NewCommentService()

	comments, total, err := commentService.ListAdmin(status, search, page, pageSize)
	if err != nil {
		utils.ErrorInternal(c, "Failed to count comments: "+err.Error())
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

	articleTitleByID, _ := commentService.ListArticleTitles(articleIDs)

	commentItems := make([]gin.H, 0, len(comments))
	for _, cmt := range comments {
		commentItems = append(commentItems, gin.H{
			"id":           cmt.ID,
			"article_id":   cmt.ArticleID,
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

	if err := services.NewCommentService().UpdateStatus(id, input.Status); err != nil {
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

	if err := services.NewCommentService().Delete(id); err != nil {
		utils.ErrorInternal(c, "Failed to delete comment")
		return
	}

	utils.Success(c, gin.H{"message": "Comment deleted"})
}

// AdminUpdateCommentStatus 更新评论状态（管理后台路由别名，兼容 /comments/:id 与 /comments/:id/status）
func AdminUpdateCommentStatus(c *gin.Context) {
	AdminUpdateComment(c)
}
