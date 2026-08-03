package routes

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// GetSiteBlocks 获取内容块
func GetSiteBlocks(c *gin.Context) {
	var blocks []models.SiteBlock
	if err := database.GetDB().Find(&blocks).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch site blocks")
		return
	}

	result := make([]map[string]interface{}, 0, len(blocks))
	for _, block := range blocks {
		result = append(result, buildPublicSiteBlockPayload(block))
	}

	utils.Success(c, result)
}

func buildPublicSiteBlockPayload(block models.SiteBlock) map[string]interface{} {
	payload := map[string]interface{}{
		"id":   block.ID,
		"name": block.Name,
	}

	var contentObj map[string]interface{}
	if block.Content != "" && json.Unmarshal([]byte(block.Content), &contentObj) == nil {
		payload["content"] = contentObj
		for k, v := range contentObj {
			if k == "id" || k == "name" || k == "content" {
				continue
			}
			// 兼容前端历史读取方式：siteBlock.title / siteBlock.subtitle
			payload[k] = v
		}
	} else {
		payload["content"] = block.Content
	}

	return payload
}
