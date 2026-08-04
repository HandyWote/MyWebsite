package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"os"

	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/services"
	"github.com/handywote/website/storage"
)

func main() {
	mode := flag.String("mode", string(services.MediaMigrationDryRun), "dry-run, apply, or verify")
	orphanReport := flag.Bool("orphans", false, "report orphan objects without deleting them")
	prefix := flag.String("prefix", "", "optional object prefix for orphan reporting")
	flag.Parse()

	ctx := context.Background()
	cfg := config.LoadConfig()
	if err := database.Connect(cfg); err != nil {
		log.Fatal(err)
	}
	if err := database.AutoMigrate(); err != nil {
		log.Fatal(err)
	}
	driver, err := storage.NewFromConfig(ctx, cfg)
	if err != nil {
		log.Fatal(err)
	}
	migration := services.NewMediaMigrationService(cfg.UploadFolder, driver, nil, nil)
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if *orphanReport {
		objects, err := migration.Orphans(ctx, *prefix)
		if err != nil {
			log.Fatal(err)
		}
		if err := encoder.Encode(map[string]interface{}{"orphans": objects, "deleted": false}); err != nil {
			log.Fatal(err)
		}
		return
	}
	result, err := migration.Run(ctx, services.MediaMigrationMode(*mode))
	if encodeErr := encoder.Encode(result); encodeErr != nil {
		log.Fatal(encodeErr)
	}
	if err != nil {
		log.Fatal(err)
	}
}
