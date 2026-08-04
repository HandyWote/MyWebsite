package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

func ExportData(c *gin.Context) {
	data, err := exportImportService.Export(c.Request.Context())
	if err != nil {
		utils.ErrorInternal(c, "Failed to export data")
		return
	}
	utils.Success(c, gin.H{"articles": data.Articles, "siteBlocks": data.SiteBlocks})
}

func ImportData(c *gin.Context) {
	var input services.ExportDataSet
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}
	if err := exportImportService.Import(c.Request.Context(), input); err != nil {
		utils.ErrorInternal(c, "Failed to import data")
		return
	}
	utils.Success(c, gin.H{"message": "Data imported successfully"})
}

func GetStats(c *gin.Context) {
	stats, err := exportImportService.Stats(c.Request.Context())
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch stats")
		return
	}
	utils.Success(c, stats)
}
