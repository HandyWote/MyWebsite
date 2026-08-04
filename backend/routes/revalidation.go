package routes

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

func AdminPendingRevalidation(c *gin.Context) {
	events, err := revalidationAdmin.Pending(c.Request.Context())
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch revalidation events")
		return
	}
	utils.Success(c, events)
}

func AdminRetryRevalidation(c *gin.Context) {
	var input struct {
		IDs []uint `json:"ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}
	count, err := revalidationAdmin.Retry(c.Request.Context(), input.IDs)
	if errors.Is(err, services.ErrMissingRevalidationToken) {
		utils.ErrorBadRequest(c, "Revalidation token is not configured")
		return
	}
	if err != nil {
		utils.ErrorInternal(c, "Failed to retry revalidation")
		return
	}
	utils.Success(c, gin.H{"retried": count})
}
