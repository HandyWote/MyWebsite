package routes

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// HealthCheck 健康检查
func HealthCheck(c *gin.Context) {
	utils.Success(c, gin.H{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}

// RobotsTxt robots.txt
func RobotsTxt(c *gin.Context) {
	baseURL := c.Request.Host
	c.String(200, "User-agent: *\nAllow: /\nSitemap: https://%s/sitemap.xml", baseURL)
}

// SitemapXml sitemap.xml
func SitemapXml(c *gin.Context) {
	baseURL := "https://" + c.Request.Host

	var articles []models.Article
	database.GetDB().Where("deleted_at IS NULL").Find(&articles)

	xml := `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`

	// 首页
	xml += fmt.Sprintf("<url><loc>%s/</loc><priority>1.0</priority></url>", baseURL)

	// 文章页
	for _, article := range articles {
		lastmod := article.UpdatedAt.Format("2006-01-02")
		xml += fmt.Sprintf("<url><loc>%s/articles/%d</loc><lastmod>%s</lastmod><priority>0.8</priority></url>",
			baseURL, article.ID, lastmod)
	}

	xml += `</urlset>`

	c.Header("Content-Type", "application/xml")
	c.String(200, xml)
}
