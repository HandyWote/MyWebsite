package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/utils"
)

// GetCategories 获取文章分类列表
func GetCategories(c *gin.Context) {
	categories, err := articleService.Categories(c.Request.Context())
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch categories")
		return
	}

	// 过滤空值
	var result []string
	for _, cat := range categories {
		if cat != "" {
			result = append(result, cat)
		}
	}

	utils.Success(c, result)
}

// GetTags 获取文章标签列表
func GetTags(c *gin.Context) {
	tags, err := articleService.Tags(c.Request.Context())
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch tags")
		return
	}

	// 解析并统计所有标签
	tagCount := make(map[string]int)
	for _, tagStr := range tags {
		if tagStr == "" {
			continue
		}
		// 假设标签以逗号分隔
		splitTags := splitTagsString(tagStr)
		for _, t := range splitTags {
			if t != "" {
				tagCount[t]++
			}
		}
	}

	// 返回计数字典 {tag: count}
	utils.Success(c, tagCount)
}

// splitTagsString 分割标签字符串
func splitTagsString(tags string) []string {
	var result []string
	var current string
	for _, ch := range tags {
		if ch == ',' {
			result = append(result, current)
			current = ""
		} else {
			current += string(ch)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}

// Verify 验证 JWT token
func Verify(c *gin.Context) {
	username, exists := c.Get("username")
	if !exists {
		utils.ErrorUnauthorized(c, "Invalid token")
		return
	}

	utils.Success(c, gin.H{
		"username": username,
		"valid":    true,
	})
}
