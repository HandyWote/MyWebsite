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

func (s *AvatarService) SetCurrent(ctx context.Context, id uint) error {
	return s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		if err := uow.Avatars.SetCurrent(ctx, id); errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAvatarNotFound
		} else if err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "avatar", Action: "update", IDs: []uint{id}}, s.now())
	})
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
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "avatar", Action: "update", IDs: []uint{avatar.ID}}, s.now())
	})
	if err != nil {
		_ = s.media.Delete(ctx, saved.Key)
		return models.Avatar{}, err
	}
	return avatar, nil
}

func (s *AvatarService) Delete(ctx context.Context, id uint) error {
	var key string
	err := s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		avatar, err := uow.Avatars.FindByID(ctx, id)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAvatarNotFound
		}
		if err != nil {
			return err
		}
		key = avatar.Filename
		if err := uow.Avatars.Delete(ctx, id); err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "avatar", Action: "delete", IDs: []uint{id}}, s.now())
	})
	if err != nil {
		return err
	}
	return s.media.Delete(ctx, key)
}
