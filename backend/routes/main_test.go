package routes

import (
	"log"
	"os"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// TestMain 负责在所有测试启动前初始化 sqlite 内存测试库，并赋值给 database.DB。
//
// 设计要点：
//   - 使用纯 Go 的 glebarez/sqlite 驱动，无需 CGO/gcc，CI 友好。
//   - 连接字符串必须用 "file::memory:?cache=shared"，开启共享内存库；
//     否则 GORM 连接池的每个连接都是独立内存库，TestMain 写入的 seed 数据
//     在 handler 通过 database.GetDB() 查询时会丢失。
//   - 只 AutoMigrate &models.Article{}。models 里 Avatar.CroppedInfo、
//     SiteBlock.Content 用 Postgres 特有的 jsonb 类型，sqlite 无法迁移，
//     本任务的 SEO 测试也只需要 Article 表。
//   - 现有其他 *_test.go 都是 mock router 模式，不读写 database.DB，
//     因此 TestMain 不会影响它们的行为。
func TestMain(m *testing.M) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatalf("初始化 sqlite 内存测试库失败: %v", err)
	}

	// 仅迁移 Article，避免 jsonb 类型在 sqlite 上报错
	if err := db.AutoMigrate(&models.Article{}); err != nil {
		log.Fatalf("sqlite AutoMigrate Article 失败: %v", err)
	}

	// 赋值给 database 包级变量，ArticleSEO 内部 database.GetDB() 会命中此内存库
	database.DB = db

	code := m.Run()
	os.Exit(code)
}
