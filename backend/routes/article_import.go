package routes

import (
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

func AdminImportMarkdown(c *gin.Context) {
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		utils.ErrorBadRequest(c, "Invalid multipart form")
		return
	}
	var files []*multipart.FileHeader
	if formFiles := c.Request.MultipartForm.File["files"]; len(formFiles) > 0 {
		files = formFiles
	} else {
		files = c.Request.MultipartForm.File["file"]
	}
	if len(files) == 0 {
		utils.ErrorBadRequest(c, "No file uploaded")
		return
	}

	documents := make([]services.MarkdownDocument, 0, len(files))
	failedFiles := make([]string, 0)
	for _, file := range files {
		filename := filepath.Base(file.Filename)
		extension := strings.ToLower(filepath.Ext(filename))
		if filename == "" || filename == "." || filename == ".." {
			failedFiles = append(failedFiles, file.Filename+": invalid filename")
			continue
		}
		if extension != ".md" && extension != ".markdown" {
			failedFiles = append(failedFiles, file.Filename+": not a markdown file")
			continue
		}
		source, err := file.Open()
		if err != nil {
			failedFiles = append(failedFiles, file.Filename+": failed to open")
			continue
		}
		content, readErr := io.ReadAll(io.LimitReader(source, 8<<20))
		source.Close()
		if readErr != nil {
			failedFiles = append(failedFiles, file.Filename+": failed to read")
			continue
		}
		documents = append(documents, services.MarkdownDocument{Filename: filename, Content: string(content)})
	}
	created, err := articleService.ImportMarkdown(c.Request.Context(), documents)
	if err != nil {
		utils.ErrorInternal(c, "Failed to import markdown")
		return
	}
	utils.Success(c, gin.H{"markdown": len(created), "failed": failedFiles})
}
