package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// AdminGetContacts 获取联系方式列表（管理）
func AdminGetContacts(c *gin.Context) {
	var contacts []models.Contact
	if err := database.GetDB().Find(&contacts).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch contacts")
		return
	}

	utils.Success(c, contacts)
}

// AdminCreateContact 创建联系方式
func AdminCreateContact(c *gin.Context) {
	var input struct {
		Type  string `json:"type" binding:"required"`
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	contact := models.Contact{
		Type:  input.Type,
		Value: input.Value,
	}

	if err := database.GetDB().Create(&contact).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create contact")
		return
	}

	utils.Success(c, contact)
}

// AdminUpdateContact 更新联系方式
func AdminUpdateContact(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	var input struct {
		Type  string `json:"type"`
		Value string `json:"value"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	updates := make(map[string]interface{})
	if input.Type != "" {
		updates["type"] = input.Type
	}
	if input.Value != "" {
		updates["value"] = input.Value
	}

	if err := database.GetDB().Model(&models.Contact{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update contact")
		return
	}

	utils.Success(c, gin.H{"message": "Contact updated"})
}

// AdminDeleteContact 删除联系方式
func AdminDeleteContact(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	if err := database.GetDB().Delete(&models.Contact{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete contact")
		return
	}

	utils.Success(c, gin.H{"message": "Contact deleted"})
}
