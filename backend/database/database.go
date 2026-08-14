package database

import (
	"fmt"
	"log"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/handywote/website/config"
	"github.com/handywote/website/models"
)

var DB *gorm.DB

func Connect(cfg *config.Config) error {
	dsn := DSN(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSchema)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connected successfully")
	return nil
}

func AutoMigrate() error {
	err := DB.AutoMigrate(
		&models.Article{},
		&models.Comment{},
		&models.Avatar{},
		&models.SiteBlock{},
		&models.AISetting{},
		&models.RevalidationOutbox{},
		&models.MediaDeleteTask{},
		&models.User{},
	)
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database migration completed")
	return nil
}

func DSN(host string, port int, user, password, dbname, schema string) string {
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)
	if strings.TrimSpace(schema) != "" {
		dsn += fmt.Sprintf(" search_path=%s", dsnValue(quoteIdentifier(schema)))
	}
	return dsn
}

func quoteIdentifier(identifier string) string {
	return `"` + strings.ReplaceAll(identifier, `"`, `""`) + `"`
}

func dsnValue(value string) string {
	value = strings.ReplaceAll(value, `\`, `\\`)
	value = strings.ReplaceAll(value, `'`, `\'`)
	return `'` + value + `'`
}

func GetDB() *gorm.DB {
	return DB
}
