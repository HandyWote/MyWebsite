package routes

import (
	"io/ioutil"
	"mime/multipart"
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

// AdminImportMarkdown 导入Markdown文章（支持多文件批量导入）
func AdminImportMarkdown(c *gin.Context) {
	// 兼容两种字段名：file（单文件）和 files（多文件）
	var files []*multipart.FileHeader

	// 首先尝试读取 files 字段（多文件）
	if formFiles, ok := c.Request.MultipartForm.File["files"]; ok && len(formFiles) > 0 {
		files = formFiles
	} else if formFile, ok := c.Request.MultipartForm.File["file"]; ok && len(formFile) > 0 {
		// 兼容单文件情况
		files = formFile
	} else {
		utils.ErrorBadRequest(c, "No file uploaded")
		return
	}

	cfg := config.LoadConfig()

	// 确保 uploads 目录存在
	if err := os.MkdirAll(cfg.UploadFolder, 0755); err != nil {
		utils.ErrorInternal(c, "Failed to create upload directory")
		return
	}

	successCount := 0
	failedFiles := []string{}

	for _, file := range files {
		// 规范化文件名
		filename := filepath.Base(file.Filename)
		if filename == "" || filename == "." || filename == ".." {
			failedFiles = append(failedFiles, file.Filename+": invalid filename")
			continue
		}

		// 检查文件类型
		ext := strings.ToLower(filepath.Ext(filename))
		if ext != ".md" && ext != ".markdown" {
			failedFiles = append(failedFiles, file.Filename+": not a markdown file")
			continue
		}

		// 打开文件获取内容
		src, err := file.Open()
		if err != nil {
			failedFiles = append(failedFiles, file.Filename+": failed to open")
			continue
		}

		// 读取文件内容
		content, err := ioutil.ReadAll(src)
		src.Close()
		if err != nil {
			failedFiles = append(failedFiles, file.Filename+": failed to read")
			continue
		}

		// 解析Markdown内容
		markdown := string(content)
		title := strings.TrimSuffix(filename, filepath.Ext(filename))

		// 从内容中提取标题（第一个 # 开头的内容）
		lines := strings.Split(markdown, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "# ") {
				title = strings.TrimPrefix(line, "# ")
				break
			}
		}

		// 创建文章
		article := models.Article{
			Title:       title,
			Content:     markdown,
			ContentType: "markdown",
		}

		if err := database.GetDB().Create(&article).Error; err != nil {
			failedFiles = append(failedFiles, file.Filename+": failed to save")
			continue
		}

		successCount++
	}

	utils.Success(c, gin.H{
		"markdown": successCount,
		"failed":   failedFiles,
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
