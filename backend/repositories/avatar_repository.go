package repositories

import (
	"context"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

type AvatarRepository struct {
	dbHolder
}

func NewAvatarRepository(db ...*gorm.DB) *AvatarRepository {
	var explicit *gorm.DB
	if len(db) > 0 {
		explicit = db[0]
	}
	return &AvatarRepository{dbHolder{explicit: explicit}}
}

func (r *AvatarRepository) Transaction(ctx context.Context, fn func(*UnitOfWork) error) error {
	return r.transaction(ctx, fn)
}

func (r *AvatarRepository) List(ctx context.Context) ([]models.Avatar, error) {
	var avatars []models.Avatar
	err := r.db(ctx).Order("uploaded_at DESC").Find(&avatars).Error
	return avatars, err
}

func (r *AvatarRepository) Current(ctx context.Context) (models.Avatar, error) {
	var avatar models.Avatar
	err := r.db(ctx).Where("is_current = ?", true).First(&avatar).Error
	return avatar, err
}

func (r *AvatarRepository) FindByID(ctx context.Context, id uint) (models.Avatar, error) {
	var avatar models.Avatar
	err := r.db(ctx).First(&avatar, id).Error
	return avatar, err
}

func (r *AvatarRepository) Create(ctx context.Context, avatar *models.Avatar) error {
	return r.db(ctx).Create(avatar).Error
}

func (r *AvatarRepository) SetCurrent(ctx context.Context, id uint) error {
	result := r.db(ctx).Model(&models.Avatar{}).Where("id = ?", id).Update("is_current", true)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return r.db(ctx).Model(&models.Avatar{}).Where("id <> ? AND is_current = ?", id, true).Update("is_current", false).Error
}

func (r *AvatarRepository) ClearOtherCurrent(ctx context.Context, id uint) error {
	return r.db(ctx).Model(&models.Avatar{}).Where("id <> ? AND is_current = ?", id, true).Update("is_current", false).Error
}

func (r *AvatarRepository) Delete(ctx context.Context, id uint) error {
	return r.db(ctx).Delete(&models.Avatar{}, id).Error
}

func (r *AvatarRepository) UpdateKey(ctx context.Context, id uint, key string) error {
	return r.db(ctx).Model(&models.Avatar{}).Where("id = ?", id).Update("filename", key).Error
}
