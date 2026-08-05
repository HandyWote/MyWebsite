package routes

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
)

// SetupRoutes 设置所有路由
func SetupRoutes(r *gin.Engine, cfg *config.Config) error {
	if err := configureServices(cfg); err != nil {
		return fmt.Errorf("configure route services: %w", err)
	}

	// Middleware
	r.Use(middleware.CORS(cfg.CORSAllowedOrigins...))
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// System routes
	r.GET("/health", HealthCheck)

	// Static files
	r.Static("/uploads", cfg.UploadFolder)

	// Admin login (without JWT middleware)
	r.POST("/api/admin/login", Login)
	r.POST("/api/admin/logout", Logout)

	// Public API
	api := r.Group("/api")
	{
		// Articles
		api.GET("/articles", GetArticles)
		api.GET("/articles/:id", GetArticle)
		api.GET("/articles/:id/comments", GetComments)
		api.POST("/articles/:id/comments", CreateComment)
		api.GET("/articles/pdf/*key", GetArticlePDF)

		// Categories & Tags
		api.GET("/categories", GetCategories)
		api.GET("/tags", GetTags)

		// Public data
		api.GET("/site-blocks", GetSiteBlocks)
		api.GET("/avatars", GetAvatars)
		api.GET("/avatars/file/*key", GetAvatarFile)

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
		admin.PUT("/site-blocks", AdminUpdateSiteBlocks) // 批量更新
		admin.DELETE("/site-blocks/:id", AdminDeleteSiteBlock)

		// Avatars
		admin.GET("/avatars", AdminGetAvatars)
		admin.POST("/avatars", AdminCreateAvatar)
		admin.PUT("/avatars/:id/set_current", AdminUpdateAvatar)
		admin.DELETE("/avatars/:id", AdminDeleteAvatar)
		// Articles
		admin.GET("/articles", AdminGetArticles)
		admin.GET("/articles/:id", AdminGetArticle)
		admin.POST("/articles", AdminCreateArticle)
		admin.PUT("/articles/:id", AdminUpdateArticle)
		admin.DELETE("/articles/:id", AdminDeleteArticle)
		admin.POST("/articles/batch-delete", AdminBatchDeleteArticles)
		admin.POST("/articles/cover", AdminUploadCover)
		admin.POST("/articles/pdf/upload", AdminUploadPdf)
		admin.POST("/articles/import-md", AdminImportMarkdown)

		// Comments
		admin.GET("/comments", AdminGetComments)
		admin.GET("/comments/export", AdminExportComments)
		admin.GET("/comments/limits", AdminGetCommentLimits)
		admin.DELETE("/comments/:id", AdminDeleteComment)
		admin.PUT("/comments/:id/status", AdminUpdateCommentStatus)

		// AI
		admin.POST("/articles/ai-analyze", AnalyzeArticleByContent)
		admin.POST("/articles/:id/analyze", AnalyzeArticle)
		admin.GET("/ai-settings", GetAISetting)
		admin.PUT("/ai-settings", UpdateAISetting)
		admin.POST("/ai-settings/test", TestAISetting)

		// Export/Import
		admin.GET("/export", ExportData)
		admin.POST("/import", ImportData)
		admin.GET("/stats", GetStats)

		// Revalidation outbox
		admin.GET("/revalidation/pending", AdminPendingRevalidation)
		admin.POST("/revalidation/retry", AdminRetryRevalidation)
	}
	return nil
}
