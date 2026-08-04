package routes

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

func isValidSiteBlockName(name string) bool { return strings.TrimSpace(name) != "" }

func AdminCreateSiteBlock(c *gin.Context) {
	var input struct {
		Name    string      `json:"name" binding:"required"`
		Content interface{} `json:"content"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}
	block, err := siteBlockService.Create(c.Request.Context(), input.Name, input.Content)
	if err != nil {
		utils.ErrorInternal(c, "Failed to create site block")
		return
	}
	utils.Success(c, block)
}

func AdminGetSiteBlocks(c *gin.Context) {
	payloads, err := siteBlockService.Payloads(c.Request.Context(), false)
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch site blocks")
		return
	}
	utils.Success(c, payloads)
}

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
	serviceInput := make([]services.SiteBlockInput, 0, len(input.Blocks))
	for _, block := range input.Blocks {
		serviceInput = append(serviceInput, services.SiteBlockInput{Name: block.Name, Content: block.Content})
	}
	updated, err := siteBlockService.UpsertMany(c.Request.Context(), serviceInput)
	if err != nil {
		utils.ErrorInternal(c, "Failed to update site blocks")
		return
	}
	utils.Success(c, updated)
}

func AdminDeleteSiteBlock(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}
	if err := siteBlockService.Delete(c.Request.Context(), id); err != nil {
		utils.ErrorInternal(c, "Failed to delete site block")
		return
	}
	utils.Success(c, gin.H{"message": "Site block deleted"})
}
