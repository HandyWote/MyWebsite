package routes

import (
	"encoding/json"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

func isValidSiteBlockName(name string) bool {
	return strings.TrimSpace(name) != ""
}

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

// AdminGetSiteBlocks 获取内容块列表（管理）
func AdminGetSiteBlocks(c *gin.Context) {
	var blocks []models.SiteBlock
	if err := database.GetDB().Find(&blocks).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch site blocks")
		return
	}

	// 将每个 block 的 content 从 JSON 字符串解析为对象
	result := make([]map[string]interface{}, 0, len(blocks))
	for _, block := range blocks {
		var contentObj interface{}
		if block.Content != "" {
			if err := json.Unmarshal([]byte(block.Content), &contentObj); err != nil {
				// 如果解析失败，直接返回原始字符串
				contentObj = block.Content
			}
		}
		result = append(result, map[string]interface{}{
			"id":      block.ID,
			"name":    block.Name,
			"content": contentObj,
		})
	}

	utils.Success(c, result)
}

// AdminUpdateSiteBlocks 批量更新内容块（匹配前端API）
func AdminUpdateSiteBlocks(c *gin.Context) {
	var input struct {
		Blocks []struct {
			Name    string      `json:"name"`
			Content interface{} `json:"content"`
		} `json:"blocks" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	updatedBlocks := make([]models.SiteBlock, 0, len(input.Blocks))

	for _, block := range input.Blocks {
		blockName := strings.TrimSpace(block.Name)
		if !isValidSiteBlockName(blockName) {
			continue
		}

		// 将 content 对象序列化为 JSON 字符串
		contentBytes, err := json.Marshal(block.Content)
		if err != nil {
			utils.ErrorInternal(c, "Failed to serialize content for: "+blockName)
			return
		}
		contentStr := string(contentBytes)

		var existingBlock models.SiteBlock
		result := database.GetDB().Where("name = ?", blockName).First(&existingBlock)

		if result.Error != nil {
			// 不存在则创建
			newBlock := models.SiteBlock{
				Name:    blockName,
				Content: contentStr,
			}
			if err := database.GetDB().Create(&newBlock).Error; err != nil {
				utils.ErrorInternal(c, "Failed to create site block: "+blockName)
				return
			}
			updatedBlocks = append(updatedBlocks, newBlock)
		} else {
			// 存在则更新
			if err := database.GetDB().Model(&existingBlock).Update("content", contentStr).Error; err != nil {
				utils.ErrorInternal(c, "Failed to update site block: "+blockName)
				return
			}
			existingBlock.Content = contentStr
			updatedBlocks = append(updatedBlocks, existingBlock)
		}
	}

	utils.Success(c, updatedBlocks)
}

// AdminDeleteSiteBlock 删除内容块
func AdminDeleteSiteBlock(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	if err := database.GetDB().Delete(&models.SiteBlock{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete site block")
		return
	}

	utils.Success(c, gin.H{"message": "Site block deleted"})
}
