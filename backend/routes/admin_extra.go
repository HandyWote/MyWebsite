package routes

import (
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// AdminBatchDeleteArticles 批量删除文章
func AdminBatchDeleteArticles(c *gin.Context) {
	var input struct {
		IDs []uint `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	if err := database.GetDB().Delete(&models.Article{}, input.IDs).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete articles")
		return
	}

	utils.Success(c, gin.H{"message": "Articles deleted"})
}

// AdminUploadCover 上传文章封面
func AdminUploadCover(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorBadRequest(c, "No file uploaded")
		return
	}

	// 使用 filepath.Base 规范化文件名，防止路径穿越攻击
	filename := filepath.Base(file.Filename)
	if filename == "" || filename == "." || filename == ".." {
		utils.ErrorBadRequest(c, "Invalid filename")
		return
	}

	cfg := config.LoadConfig()

	// 保存文件到配置的 uploads 目录
	uploadPath := filepath.Join(cfg.UploadFolder, filename)
	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		utils.ErrorInternal(c, "Failed to save file")
		return
	}

	utils.Success(c, gin.H{
		"filename": filename,
		"url":      "/uploads/" + filename,
	})
}

// AdminGetAvatars 获取头像列表（管理）
func AdminGetAvatars(c *gin.Context) {
	GetAvatars(c)
}

// AdminCreateAvatar 上传头像（管理）
func AdminCreateAvatar(c *gin.Context) {
	UploadAvatar(c)
}

// AdminUpdateAvatar 更新头像（管理）
func AdminUpdateAvatar(c *gin.Context) {
	SetCurrentAvatar(c)
}

// AdminDeleteAvatar 删除头像（管理）
func AdminDeleteAvatar(c *gin.Context) {
	DeleteAvatar(c)
}

// AdminUpdateCommentStatus 更新评论状态（管理）
func AdminUpdateCommentStatus(c *gin.Context) {
	AdminUpdateComment(c)
}
