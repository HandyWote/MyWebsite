package routes

import (
	"encoding/json"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// ExportData 导出数据
func ExportData(c *gin.Context) {
	var articles []models.Article
	database.GetDB().Find(&articles)

	var skills []models.Skill
	database.GetDB().Find(&skills)

	var contacts []models.Contact
	database.GetDB().Find(&contacts)

	var siteBlocks []models.SiteBlock
	database.GetDB().Find(&siteBlocks)

	data := gin.H{
		"articles":   articles,
		"skills":     skills,
		"contacts":   contacts,
		"siteBlocks": siteBlocks,
	}

	utils.Success(c, data)
}

// ImportData 导入数据
func ImportData(c *gin.Context) {
	var input struct {
		Articles   []models.Article   `json:"articles"`
		Skills     []models.Skill     `json:"skills"`
		Contacts   []models.Contact   `json:"contacts"`
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

	// 导入技能
	if len(input.Skills) > 0 {
		for _, skill := range input.Skills {
			skill.ID = 0
			database.GetDB().Create(&skill)
		}
	}

	// 导入联系方式
	if len(input.Contacts) > 0 {
		for _, contact := range input.Contacts {
			contact.ID = 0
			database.GetDB().Create(&contact)
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
	var skillCount int64
	var contactCount int64

	database.GetDB().Model(&models.Article{}).Count(&articleCount)
	database.GetDB().Model(&models.Comment{}).Count(&commentCount)
	database.GetDB().Model(&models.Skill{}).Count(&skillCount)
	database.GetDB().Model(&models.Contact{}).Count(&contactCount)

	utils.Success(c, gin.H{
		"articles": articleCount,
		"comments": commentCount,
		"skills":   skillCount,
		"contacts": contactCount,
	})
}

var _ = json.Marshal
var _ = fmt.Sprintf
