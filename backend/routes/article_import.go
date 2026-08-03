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
