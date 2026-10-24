package services

import (
	"context"
	"errors"
	"io"
	"time"

	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"gorm.io/gorm"
)

var ErrAvatarNotFound = errors.New("avatar not found")

type AvatarService struct {
	repository *repositories.AvatarRepository
	media      *MediaStorageService
	now        func() time.Time
}

func NewAvatarService(repository *repositories.AvatarRepository, media *MediaStorageService) *AvatarService {
	if repository == nil {
		repository = repositories.NewAvatarRepository()
	}
	return &AvatarService{repository: repository, media: media, now: time.Now}
}

func (s *AvatarService) List(ctx context.Context) ([]models.Avatar, error) {
	avatars, err := s.repository.List(ctx)
	if err == nil {
		for index := range avatars {
			avatars[index].URL = s.media.PublicURL(avatars[index].Filename)
		}
	}
	return avatars, err
}

func (s *AvatarService) Current(ctx context.Context) (models.Avatar, error) {
	avatar, err := s.repository.Current(ctx)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Avatar{}, ErrAvatarNotFound
	}
	avatar.URL = s.media.PublicURL(avatar.Filename)
	return avatar, err
}

func (s *AvatarService) Upload(ctx context.Context, filename string, body io.Reader, size int64) (models.Avatar, error) {
	saved, err := s.media.Save(ctx, MediaAvatar, filename, body, size)
	if err != nil {
		return models.Avatar{}, err
	}
	avatar := models.Avatar{Filename: saved.Key, URL: saved.URL, IsCurrent: true, UploadedAt: s.now()}
	err = s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		if err := uow.Avatars.Create(ctx, &avatar); err != nil {
			return err
		}
		if err := uow.Avatars.ClearOtherCurrent(ctx, avatar.ID); err != nil {
			return err
		}
		// 单头像：数据库只留这一张。
		//
		// 注意：旧文件**故意不删**。前台头像 URL 会被 Next 的 publicDataPolicy
		// （CACHE_TAGS.profile）缓存，revalidate 之前页面里仍是旧 URL；如果连文件
		// 一起删，这段时间线上就是坏图（本地实测复现过）。旧文件因此留成孤立对象，
		// 由后续媒体孤儿清理任务统一回收，而不是在替换路径上追求即时删除。
		if err := uow.Avatars.DeleteOthers(ctx, avatar.ID); err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "avatar", Action: "update", IDs: []uint{avatar.ID}}, s.now())
	})
	if err != nil {
		_ = s.media.Delete(ctx, saved.Key)
		return models.Avatar{}, err
	}
	return avatar, nil
}

// Delete 删除头像记录。
//
// 与 Upload 同一策略：**媒体对象保留**。头像 URL 会被 Next 的 publicDataPolicy
// （CACHE_TAGS.profile）缓存，revalidate 真正生效前页面里仍是旧 URL；此刻删文件
// 就是坏图。孤立对象由媒体孤儿清理任务统一回收，不在删除路径上追求即时释放。
func (s *AvatarService) Delete(ctx context.Context, id uint) error {
	return s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		if _, err := uow.Avatars.FindByID(ctx, id); errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAvatarNotFound
		} else if err != nil {
			return err
		}
		if err := uow.Avatars.Delete(ctx, id); err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "avatar", Action: "delete", IDs: []uint{id}}, s.now())
	})
}
