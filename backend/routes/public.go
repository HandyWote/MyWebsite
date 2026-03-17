package routes

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
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
			// 兼容前端历史读取方式：siteBlock.title / siteBlock.subtitle
			payload[k] = v
		}
	} else {
		payload["content"] = block.Content
	}

	return payload
}

// GetSkills 获取技能列表
func GetSkills(c *gin.Context) {
	var skills []models.Skill
	if err := database.GetDB().Order("level DESC").Find(&skills).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch skills")
		return
	}

	utils.Success(c, skills)
}

// GetContacts 获取联系方式
func GetContacts(c *gin.Context) {
	var contacts []models.Contact
	if err := database.GetDB().Find(&contacts).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch contacts")
		return
	}

	utils.Success(c, contacts)
}

// GetAvatars 获取头像列表
func GetAvatars(c *gin.Context) {
	var avatars []models.Avatar
	if err := database.GetDB().Where("deleted_at IS NULL").Order("uploaded_at DESC").Find(&avatars).Error; err != nil {
		utils.ErrorInternal(c, "Failed to fetch avatars")
		return
	}

	utils.Success(c, avatars)
}

// GetCurrentAvatar 获取当前头像
func GetCurrentAvatar(c *gin.Context) {
	var avatar models.Avatar
	if err := database.GetDB().Where("is_current = ? AND deleted_at IS NULL", true).First(&avatar).Error; err != nil {
		utils.ErrorNotFound(c, "Current avatar not found")
		return
	}

	utils.Success(c, avatar)
}

// SetCurrentAvatar 设置当前头像
func SetCurrentAvatar(c *gin.Context) {
	var avatarID uint

	// 优先从路径参数获取 avatar_id
	if idStr := c.Param("id"); idStr != "" {
		if parsed, err := strconv.ParseUint(idStr, 10, 32); err == nil {
			avatarID = uint(parsed)
		}
	}

	// 如果路径参数没有，则尝试从 JSON body 获取
	if avatarID == 0 {
		var input struct {
			AvatarID uint `json:"avatar_id"`
		}
		if err := c.ShouldBindJSON(&input); err == nil && input.AvatarID != 0 {
			avatarID = input.AvatarID
		}
	}

	if avatarID == 0 {
		utils.ErrorBadRequest(c, "Avatar ID is required")
		return
	}

	// 先取消所有当前头像
	database.GetDB().Model(&models.Avatar{}).Where("is_current = ?", true).Update("is_current", false)

	// 设置新头像
	if err := database.GetDB().Model(&models.Avatar{}).Where("id = ?", avatarID).Update("is_current", true).Error; err != nil {
		utils.ErrorInternal(c, "Failed to set current avatar")
		return
	}

	utils.Success(c, gin.H{"message": "Avatar updated successfully"})
}

// UploadAvatar 上传头像
func UploadAvatar(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorBadRequest(c, "No file uploaded")
		return
	}

	// 使用 filepath.Base 规范化文件名，防止路径穿越攻击
	filename := filepath.Base(file.Filename)
	if filename == "" || filename == "." || filename == ".." {
		utils.ErrorBadRequest(c, "Invalid filename")
		return
	}

	cfg := config.LoadConfig()

	// 保存文件到配置的 uploads 目录
	uploadPath := filepath.Join(cfg.UploadFolder, filename)
	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		utils.ErrorInternal(c, "Failed to save file")
		return
	}

	avatar := models.Avatar{
		Filename:  filename,
		IsCurrent: false,
	}

	if err := database.GetDB().Create(&avatar).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create avatar record")
		return
	}

	utils.Success(c, avatar)
}

// DeleteAvatar 删除头像
func DeleteAvatar(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	if err := database.GetDB().Delete(&models.Avatar{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete avatar")
		return
	}

	utils.Success(c, gin.H{"message": "Avatar deleted successfully"})
}

// GetAvatarFile 获取头像文件
func GetAvatarFile(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		utils.ErrorBadRequest(c, "Filename is required")
		return
	}

	cfg := config.LoadConfig()
	filePath := filepath.Join(cfg.UploadFolder, filename)

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		utils.ErrorNotFound(c, "File not found")
		return
	}

	c.File(filePath)
}
