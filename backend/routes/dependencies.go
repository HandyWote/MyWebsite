package routes

import (
	"context"
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

func init() {
	configureServices(config.LoadConfig())
}

func StartMediaDeleteWorker(ctx context.Context) {
	go mediaService.RunDeleteWorker(ctx, time.Minute)
}

func configureServices(cfg *config.Config) {
	runtimeConfig = cfg
	driver, err := mediastorage.NewFromConfig(context.Background(), cfg)
	if err != nil {
		panic(err)
	}
	mediaService = services.NewMediaStorageService(driver, nil, cfg.MaxContentLength, cfg.AllowedImageExtensions)
	avatarService = services.NewAvatarService(repositories.NewAvatarRepository(), mediaService)
	revalidationAdmin = services.NewRevalidationAdminService(nil, cfg.RevalidationToken)
}
