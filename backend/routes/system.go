package routes

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/utils"
)

// HealthCheck 健康检查
func HealthCheck(c *gin.Context) {
	utils.Success(c, gin.H{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}
