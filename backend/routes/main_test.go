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
//   - 只迁移文章与 transactional outbox；头像和站点块由 service 测试使用独立库覆盖。
//   - 现有其他 *_test.go 大多是 mock router 模式，不读写 database.DB。
func TestMain(m *testing.M) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatalf("初始化 sqlite 内存测试库失败: %v", err)
	}

	if err := db.AutoMigrate(&models.Article{}, &models.RevalidationOutbox{}); err != nil {
		log.Fatalf("sqlite AutoMigrate 失败: %v", err)
	}

	// Repository default constructors resolve this test database lazily.
	database.DB = db

	code := m.Run()
	os.Exit(code)
}
