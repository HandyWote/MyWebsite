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
		&models.Skill{},
		&models.Contact{},
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

	// 拉取 Vite 构建产物映射，供 SEO HTML 注入正确的 JS/CSS 路径（修真人直接访问 /articles/:id 白屏）。
	// 失败不阻塞启动（仅日志告警）：SEO 标签不依赖 manifest，降级时仍完整；真人首屏白屏由运维看日志修复。
	routes.FetchViteManifest("")

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

	// Seed Skills
	db.Model(&models.Skill{}).Count(&count)
	if count == 0 {
		skills := []models.Skill{
			{Name: "Python", Description: "熟练掌握 Python 编程", Level: 90},
			{Name: "React", Description: "熟悉 React 前端开发", Level: 85},
		}
		db.Create(&skills)
		log.Println("Seeded skills")
	}

	// Seed Contacts
	db.Model(&models.Contact{}).Count(&count)
	if count == 0 {
		contacts := []models.Contact{
			{Type: "email", Value: "handywote@example.com"},
			{Type: "github", Value: "https://github.com/handywote"},
		}
		db.Create(&contacts)
		log.Println("Seeded contacts")
	}
}
