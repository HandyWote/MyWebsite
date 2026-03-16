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
	c.String(200, "User-agent: *\nAllow: /\nSitemap: http://%s/sitemap.xml", baseURL)
}

// SitemapXml sitemap.xml
func SitemapXml(c *gin.Context) {
	baseURL := "https://" + c.Request.Host

	var articles []models.Article
	database.GetDB().Where("deleted_at IS NULL").Find(&articles)

	urls := []string{
		fmt.Sprintf("%s/", baseURL),
		fmt.Sprintf("%s/articles", baseURL),
	}

	for _, article := range articles {
		urls = append(urls, fmt.Sprintf("%s/articles/%d", baseURL, article.ID))
	}

	xml := `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
	for _, url := range urls {
		xml += fmt.Sprintf("<url><loc>%s</loc><lastmod>%s</lastmod></url>", url, time.Now().Format("2006-01-02"))
	}
	xml += `</urlset>`

	c.Header("Content-Type", "application/xml")
	c.String(200, xml)
}
