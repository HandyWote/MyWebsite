package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// AdminGetSkills 获取技能列表（管理）
func AdminGetSkills(c *gin.Context) {
	var skills []models.Skill
	if err := database.GetDB().Order("level DESC").Find(&skills).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch skills")
		return
	}

	utils.Success(c, skills)
}

// AdminCreateSkill 创建技能
func AdminCreateSkill(c *gin.Context) {
	var input struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Level       int    `json:"level"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	skill := models.Skill{
		Name:        input.Name,
		Description: input.Description,
		Level:       input.Level,
	}

	if err := database.GetDB().Create(&skill).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create skill")
		return
	}

	utils.Success(c, skill)
}

// AdminUpdateSkill 更新技能
func AdminUpdateSkill(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Level       int    `json:"level"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	updates := make(map[string]interface{})
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Description != "" {
		updates["description"] = input.Description
	}
	if input.Level > 0 {
		updates["level"] = input.Level
	}

	if err := database.GetDB().Model(&models.Skill{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update skill")
		return
	}

	utils.Success(c, gin.H{"message": "Skill updated"})
}

// AdminDeleteSkill 删除技能
func AdminDeleteSkill(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	if err := database.GetDB().Delete(&models.Skill{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete skill")
		return
	}

	utils.Success(c, gin.H{"message": "Skill deleted"})
}
