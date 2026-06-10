package routes

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/utils"
)

// ParsePaginationParams 解析分页参数，统一 admin 列表接口的分页逻辑。
// 优先使用 per_page 参数，回退到 page_size，默认值为 10。
// page 最小值为 1，pageSize 最小值为 1。
func ParsePaginationParams(c *gin.Context) (page, pageSize int) {
	page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}

	pageSize, _ = strconv.Atoi(c.Query("per_page"))
	if pageSize == 0 {
		pageSize, _ = strconv.Atoi(c.DefaultQuery("page_size", "10"))
	}
	if pageSize < 1 {
		pageSize = 10
	}

	return page, pageSize
}

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
