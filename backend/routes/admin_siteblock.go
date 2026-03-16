package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// AdminCreateSiteBlock 创建内容块
func AdminCreateSiteBlock(c *gin.Context) {
	var input struct {
		Name    string `json:"name" binding:"required"`
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	block := models.SiteBlock{
		Name:    input.Name,
		Content: input.Content,
	}

	if err := database.GetDB().Create(&block).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create site block")
		return
	}

	utils.Success(c, block)
}
