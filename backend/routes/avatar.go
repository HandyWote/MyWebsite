package routes

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/models"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

func buildUploadedAvatar(filename string) models.Avatar {
	return models.Avatar{Filename: filename, IsCurrent: true}
}

func createThenClearCurrent(create func() error, clear func() error) error {
	if err := create(); err != nil {
		return err
	}
	return clear()
}

func GetAvatars(c *gin.Context) {
	avatars, err := avatarService.List(c.Request.Context())
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch avatars")
		return
	}
	utils.Success(c, avatars)
}

func GetCurrentAvatar(c *gin.Context) {
	avatar, err := avatarService.Current(c.Request.Context())
	if errors.Is(err, services.ErrAvatarNotFound) {
		utils.ErrorNotFound(c, "Current avatar not found")
		return
	}
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch avatar")
		return
	}
	utils.Success(c, avatar)
}

func SetCurrentAvatar(c *gin.Context) {
	var avatarID uint
	if idString := c.Param("id"); idString != "" {
		if parsed, err := strconv.ParseUint(idString, 10, 32); err == nil {
			avatarID = uint(parsed)
		}
	}
	if avatarID == 0 {
		var input struct {
			AvatarID uint `json:"avatar_id"`
		}
		if err := c.ShouldBindJSON(&input); err == nil {
			avatarID = input.AvatarID
		}
	}
	if avatarID == 0 {
		utils.ErrorBadRequest(c, "Avatar ID is required")
		return
	}
	if err := avatarService.SetCurrent(c.Request.Context(), avatarID); err != nil {
		if errors.Is(err, services.ErrAvatarNotFound) {
			utils.ErrorNotFound(c, "Avatar not found")
		} else {
			utils.ErrorInternal(c, "Failed to set current avatar")
		}
		return
	}
	utils.Success(c, gin.H{"message": "Avatar updated successfully"})
}

func UploadAvatar(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorBadRequest(c, "No file uploaded")
		return
	}
	source, err := file.Open()
	if err != nil {
		utils.ErrorBadRequest(c, "Failed to open upload")
		return
	}
	defer source.Close()
	avatar, err := avatarService.Upload(c.Request.Context(), file.Filename, source, file.Size)
	if err != nil {
		utils.ErrorBadRequest(c, err.Error())
		return
	}
	utils.Success(c, avatar)
}

func DeleteAvatar(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}
	if err := avatarService.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrAvatarNotFound) {
			utils.ErrorNotFound(c, "Avatar not found")
		} else {
			utils.ErrorInternal(c, "Failed to delete avatar")
		}
		return
	}
	utils.Success(c, gin.H{"message": "Avatar deleted successfully"})
}

func GetAvatarFile(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		utils.ErrorBadRequest(c, "Filename is required")
		return
	}
	c.Redirect(302, mediaService.PublicURL(filename))
}
