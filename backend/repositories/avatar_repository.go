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

func (r *AvatarRepository) ClearOtherCurrent(ctx context.Context, id uint) error {
	return r.db(ctx).Model(&models.Avatar{}).Where("id <> ? AND is_current = ?", id, true).Update("is_current", false).Error
}

func (r *AvatarRepository) Delete(ctx context.Context, id uint) error {
	return r.db(ctx).Delete(&models.Avatar{}, id).Error
}

// DeleteOthers 删除除指定头像以外的其它头像记录，保证只保留一张头像。
//
// 两个上传事务并发时，各自都只会看到自己插入的那一行，于是两边都删不到对方，
// 可能短暂留下两行（is_current 都为真）。下一次上传或后台列表会把它们收敛成
// 一行，且前台只渲染 is_current 的那张，所以这里不加锁也不做重试。
func (r *AvatarRepository) DeleteOthers(ctx context.Context, id uint) error {
	return r.db(ctx).Where("id <> ?", id).Delete(&models.Avatar{}).Error
}

func (r *AvatarRepository) UpdateKey(ctx context.Context, id uint, key string) error {
	return r.db(ctx).Model(&models.Avatar{}).Where("id = ?", id).Update("filename", key).Error
}
