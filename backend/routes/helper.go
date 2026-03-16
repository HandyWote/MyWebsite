package routes

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/utils"
)

// ParseUintParam 解析 uint 类型路径参数
func ParseUintParam(c *gin.Context, paramName string) (uint, bool) {
	idStr := c.Param(paramName)
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid ID parameter")
		return 0, false
	}
	return uint(id), true
}
