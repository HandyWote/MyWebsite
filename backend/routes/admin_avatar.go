package routes

import (
	"github.com/gin-gonic/gin"
)

// AdminGetAvatars 获取头像列表（管理）
func AdminGetAvatars(c *gin.Context) {
	GetAvatars(c)
}

// AdminCreateAvatar 上传头像（管理）
func AdminCreateAvatar(c *gin.Context) {
	UploadAvatar(c)
}

// AdminUpdateAvatar 更新头像（管理）
func AdminUpdateAvatar(c *gin.Context) {
	SetCurrentAvatar(c)
}

// AdminDeleteAvatar 删除头像（管理）
func AdminDeleteAvatar(c *gin.Context) {
	DeleteAvatar(c)
}
