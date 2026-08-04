package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

func GetArticlePDF(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		utils.ErrorBadRequest(c, "Filename is required")
		return
	}
	c.Redirect(302, mediaService.PDFURL(c.Request.Context(), filename))
}

func AdminBatchDeleteArticles(c *gin.Context) {
	var input struct {
		IDs []uint `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || len(input.IDs) == 0 {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}
	if err := articleService.BatchDelete(c.Request.Context(), input.IDs); err != nil {
		utils.ErrorInternal(c, "Failed to delete articles")
		return
	}
	utils.Success(c, gin.H{"message": "Articles deleted"})
}

func AdminUploadCover(c *gin.Context) {
	uploadArticleMedia(c, services.MediaCover)
}

func AdminUploadPdf(c *gin.Context) {
	uploadArticleMedia(c, services.MediaPDF)
}

func uploadArticleMedia(c *gin.Context, kind services.MediaKind) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorBadRequest(c, "No file uploaded")
		return
	}
	source, err := file.Open()
	if err != nil {
		utils.ErrorBadRequest(c, "Failed to open upload")
		return
	}
	defer source.Close()
	saved, err := mediaService.Save(c.Request.Context(), kind, file.Filename, source, file.Size)
	if err != nil {
		utils.ErrorBadRequest(c, err.Error())
		return
	}
	utils.Success(c, gin.H{"filename": saved.Key, "key": saved.Key, "url": saved.URL})
}
