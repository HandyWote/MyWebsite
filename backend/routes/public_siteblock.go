package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/models"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

func GetSiteBlocks(c *gin.Context) {
	payloads, err := siteBlockService.Payloads(c.Request.Context(), true)
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch site blocks")
		return
	}
	utils.Success(c, payloads)
}

func buildPublicSiteBlockPayload(block models.SiteBlock) map[string]interface{} {
	return services.SiteBlockPayloadMap(block, true)
}
