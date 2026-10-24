package routes

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

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

func UploadAvatar(c *gin.Context) {
	limitUploadBody(c)
	file, err := c.FormFile("file")
	if err != nil {
		if isRequestTooLarge(err) {
			utils.ErrorPayloadTooLarge(c, "Upload exceeds size limit")
			return
		}
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
		if errors.Is(err, services.ErrMediaTooLarge) {
			utils.ErrorPayloadTooLarge(c, "Upload exceeds size limit")
			return
		}
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
	key := strings.TrimPrefix(c.Param("key"), "/")
	if key == "" {
		utils.ErrorBadRequest(c, "Filename is required")
		return
	}
	publicURL := mediaService.AvatarURL(c.Request.Context(), key)
	if publicURL == "" {
		utils.ErrorBadRequest(c, "Invalid media key")
		return
	}
	c.Redirect(302, publicURL)
}
