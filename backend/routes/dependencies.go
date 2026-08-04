package routes

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/handywote/website/config"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/services"
	mediastorage "github.com/handywote/website/storage"
)

var (
	articleService      = services.NewArticleService()
	aiService           = services.NewAIService(nil, nil, nil)
	commentService      = services.NewCommentService()
	siteBlockService    = services.NewSiteBlockService()
	exportImportService = services.NewExportImportService(nil, nil, nil)
	mediaService        *services.MediaStorageService
	avatarService       *services.AvatarService
	revalidationAdmin   *services.RevalidationAdminService
	runtimeConfig       *config.Config
)

func StartMediaDeleteWorker(ctx context.Context) {
	go mediaService.RunDeleteWorker(ctx, time.Minute)
}

func configureServices(cfg *config.Config) error {
	if cfg == nil {
		return errors.New("route configuration is required")
	}
	driver, err := mediastorage.NewFromConfig(context.Background(), cfg)
	if err != nil {
		return fmt.Errorf("initialize media storage: %w", err)
	}

	configuredMedia := services.NewMediaStorageService(driver, nil, cfg.MaxContentLength, cfg.AllowedImageExtensions)
	runtimeConfig = cfg
	mediaService = configuredMedia
	avatarService = services.NewAvatarService(repositories.NewAvatarRepository(), configuredMedia)
	revalidationAdmin = services.NewRevalidationAdminService(nil, cfg.RevalidationToken)
	return nil
}
