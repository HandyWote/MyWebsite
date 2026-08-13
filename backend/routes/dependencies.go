package routes

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/handywote/website/config"
	"github.com/handywote/website/ratelimit"
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

	// loginLimiter 密码登录限流器（B5 ratelimit 包），按 cfg 的
	// LoginRateLimitMax/LoginRateLimitWindowMinutes 实例化。默认禁用
	// （未走 SetupRoutes 时），测试可整体替换以注入可控时钟。
	loginLimiter = ratelimit.New(0, 0, nil)
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
	loginLimiter = ratelimit.New(cfg.LoginRateLimitMax, time.Duration(cfg.LoginRateLimitWindowMinutes)*time.Minute, nil)
	return nil
}
