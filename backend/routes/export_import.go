package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// ExportData 导出数据
func ExportData(c *gin.Context) {
	var articles []models.Article
	database.GetDB().Find(&articles)

	var siteBlocks []models.SiteBlock
	database.GetDB().Find(&siteBlocks)

	data := gin.H{
		"articles":   articles,
		"siteBlocks": siteBlocks,
	}

	utils.Success(c, data)
}

// ImportData 导入数据
func ImportData(c *gin.Context) {
	var input struct {
		Articles   []models.Article   `json:"articles"`
		SiteBlocks []models.SiteBlock `json:"siteBlocks"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	// 导入文章
	if len(input.Articles) > 0 {
		for _, article := range input.Articles {
			article.ID = 0 // 重新生成 ID
			database.GetDB().Create(&article)
		}
	}

	// 导入内容块
	if len(input.SiteBlocks) > 0 {
		for _, block := range input.SiteBlocks {
			block.ID = 0
			database.GetDB().Create(&block)
		}
	}

	utils.Success(c, gin.H{"message": "Data imported successfully"})
}

// GetStats 获取统计信息
func GetStats(c *gin.Context) {
	var articleCount int64
	var commentCount int64

	database.GetDB().Model(&models.Article{}).Count(&articleCount)
	database.GetDB().Model(&models.Comment{}).Count(&commentCount)

	utils.Success(c, gin.H{
		"articles": articleCount,
		"comments": commentCount,
	})
}
