package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/migrations"
	"github.com/handywote/website/models"
	"github.com/handywote/website/routes"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Connect to database (fail fast if DB unavailable)
	if err := database.Connect(cfg); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}

	// Auto migrate
	database.GetDB().AutoMigrate(
		&models.Article{},
		&models.Comment{},
		&models.Avatar{},
		&models.SiteBlock{},
		&models.AISetting{},
	)

	// Run smart column migrations (only add missing columns)
	if err := migrations.RunMigrations(database.GetDB()); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Seed initial data
	seedData()

	// Create Gin router
	r := gin.Default()

	// Setup routes
	routes.SetupRoutes(r, cfg)

	// 后台拉取 Vite 构建产物映射，供 SEO HTML 注入正确的 JS/CSS 路径。
	// frontend 容器可能晚于 backend 就绪，后台重试可避免启动顺序导致 manifest 永久缺失。
	routes.StartViteManifestFetch("")

	// Start server on configured port
	port := cfg.Port

	log.Printf("Starting server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// seedData 初始化数据
func seedData() {
	db := database.GetDB()

	// Seed SiteBlocks
	var count int64
	db.Model(&models.SiteBlock{}).Count(&count)
	if count == 0 {
		blocks := []models.SiteBlock{
			{Name: "home", Content: `{"title":"HandyWote","desc":"少年侠气交结五都雄！"}`},
			{Name: "about", Content: `{"desc":"汕头大学 | 黄应辉"}`},
		}
		db.Create(&blocks)
		log.Println("Seeded site blocks")
	}

}
