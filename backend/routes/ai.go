package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/models"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

// AnalyzeArticle AI 分析文章
func AnalyzeArticle(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	cfg := config.LoadConfig()

	result, err := services.AnalyzeWithAI(id, cfg)
	if err != nil {
		utils.ErrorInternal(c, "Failed to analyze article: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"analysis": result})
}

// GetAISetting 获取 AI 配置
func GetAISetting(c *gin.Context) {
	setting, err := services.GetAISetting()
	if err != nil {
		utils.ErrorNotFound(c, "AI setting not found")
		return
	}

	utils.Success(c, setting)
}

// UpdateAISetting 更新 AI 配置
func UpdateAISetting(c *gin.Context) {
	var input models.AISetting
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	setting, err := services.UpdateAISetting(input)
	if err != nil {
		utils.ErrorInternal(c, "Failed to update AI setting")
		return
	}

	utils.Success(c, setting)
}
