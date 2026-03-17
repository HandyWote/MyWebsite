package routes

import (
	"bytes"
	"encoding/csv"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// AdminExportComments 导出评论（CSV）
func AdminExportComments(c *gin.Context) {
	query := database.GetDB().Model(&models.Comment{})
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("content ILIKE ? OR author ILIKE ? OR ip_address ILIKE ?", like, like, like)
	}

	var comments []models.Comment
	if err := query.Order("created_at DESC").Find(&comments).Error; err != nil {
		utils.ErrorInternal(c, "Failed to export comments")
		return
	}

	buf := &bytes.Buffer{}
	w := csv.NewWriter(buf)
	_ = w.Write([]string{"id", "article_id", "author", "email", "content", "ip_address", "status", "created_at"})
	for _, cm := range comments {
		_ = w.Write([]string{
			strconv.FormatUint(uint64(cm.ID), 10),
			strconv.FormatUint(uint64(cm.ArticleID), 10),
			cm.Author,
			cm.Email,
			cm.Content,
			cm.IPAddress,
			cm.Status,
			cm.CreatedAt.Format(time.RFC3339),
		})
	}
	w.Flush()

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=comments_export.csv")
	c.Data(200, "text/csv; charset=utf-8", buf.Bytes())
}

// AdminGetCommentLimits 获取评论限制配置
func AdminGetCommentLimits(c *gin.Context) {
	cfg := config.LoadConfig()
	utils.Success(c, gin.H{
		"enabled":      cfg.CommentLimitEnabled,
		"time_window":  cfg.CommentLimitTimeWindow,
		"max_count":    cfg.CommentLimitMaxCount,
		"exempt_admin": cfg.CommentLimitExemptAdmin,
	})
}
