package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
)

// SetupRoutes 设置所有路由
func SetupRoutes(r *gin.Engine, cfg *config.Config) {
	// Middleware
	r.Use(middleware.CORS())
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// System routes
	r.GET("/health", HealthCheck)
	r.GET("/robots.txt", RobotsTxt)
	r.GET("/sitemap.xml", SitemapXml)

	// Static files
	r.Static("/uploads", cfg.UploadFolder)

	// Admin login (without JWT middleware)
	r.POST("/api/admin/login", Login)

	// Public API
	api := r.Group("/api")
	{
		// Articles
		api.GET("/articles", GetArticles)
		api.GET("/articles/:id", GetArticle)
		api.GET("/articles/:id/comments", GetComments)
		api.POST("/articles/:id/comments", CreateComment)
		api.GET("/articles/pdf/:filename", func(c *gin.Context) {
			c.File(cfg.UploadFolder + "/pdfs/" + c.Param("filename"))
		})

		// Categories & Tags
		api.GET("/categories", GetCategories)
		api.GET("/tags", GetTags)

		// Public data
		api.GET("/site-blocks", GetSiteBlocks)
		api.GET("/skills", GetSkills)
		api.GET("/contacts", GetContacts)
		api.GET("/avatars", GetAvatars)

		// Auth
		api.POST("/auth/login", Login)
		api.POST("/auth/logout", Logout)
	}

	// Admin API (with JWT auth)
	admin := r.Group("/api/admin")
	admin.Use(middleware.JWTAuth(cfg.JWTSecretKey))
	{
		// Auth
		admin.GET("/verify", Verify)
		admin.GET("/auth/me", GetCurrentUser)

		// Site Blocks
		admin.GET("/site-blocks", AdminGetSiteBlocks)
		admin.POST("/site-blocks", AdminCreateSiteBlock)
		admin.PUT("/site-blocks/:name", AdminUpdateSiteBlock)
		admin.DELETE("/site-blocks/:id", AdminDeleteSiteBlock)

		// Skills
		admin.GET("/skills", AdminGetSkills)
		admin.POST("/skills", AdminCreateSkill)
		admin.PUT("/skills/:id", AdminUpdateSkill)
		admin.DELETE("/skills/:id", AdminDeleteSkill)

		// Contacts
		admin.GET("/contacts", AdminGetContacts)
		admin.POST("/contacts", AdminCreateContact)
		admin.PUT("/contacts/:id", AdminUpdateContact)
		admin.DELETE("/contacts/:id", AdminDeleteContact)

		// Avatars
		admin.GET("/avatars", AdminGetAvatars)
		admin.POST("/avatars", AdminCreateAvatar)
		admin.PUT("/avatars/:id/set_current", AdminUpdateAvatar)
		admin.DELETE("/avatars/:id", AdminDeleteAvatar)
		admin.GET("/avatars/file/:filename", GetAvatarFile)

		// Articles
		admin.GET("/articles", AdminGetArticles)
		admin.GET("/articles/:id", AdminGetArticle)
		admin.POST("/articles", AdminCreateArticle)
		admin.PUT("/articles/:id", AdminUpdateArticle)
		admin.DELETE("/articles/:id", AdminDeleteArticle)
		admin.POST("/articles/batch-delete", AdminBatchDeleteArticles)
		admin.POST("/articles/cover", AdminUploadCover)

		// Comments
		admin.GET("/comments", AdminGetComments)
		admin.DELETE("/comments/:id", AdminDeleteComment)
		admin.PUT("/comments/:id", AdminUpdateCommentStatus)
		admin.PUT("/comments/:id/status", AdminUpdateCommentStatus)

		// AI
		admin.POST("/articles/:id/analyze", AnalyzeArticle)
		admin.GET("/ai-settings", GetAISetting)
		admin.PUT("/ai-settings", UpdateAISetting)

		// Export/Import
		admin.GET("/export", ExportData)
		admin.POST("/import", ImportData)
		admin.GET("/stats", GetStats)
	}
}
