package routes

import (
	"os"
	"path/filepath"
	"strings"

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

// AdminUploadPdf 上传文章PDF
func AdminUploadPdf(c *gin.Context) {
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

	// 检查文件类型
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".pdf" {
		utils.ErrorBadRequest(c, "Only PDF files are allowed")
		return
	}

	cfg := config.LoadConfig()

	// 确保 PDFs 目录存在
	pdfDir := filepath.Join(cfg.UploadFolder, "pdfs")
	if err := os.MkdirAll(pdfDir, 0755); err != nil {
		utils.ErrorInternal(c, "Failed to create upload directory")
		return
	}

	// 保存文件到 PDFs 目录
	uploadPath := filepath.Join(pdfDir, filename)
	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		utils.ErrorInternal(c, "Failed to save file")
		return
	}

	utils.Success(c, gin.H{
		"filename": filename,
		"url":      "/api/articles/pdf/" + filename,
	})
}
