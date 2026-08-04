package repositories

import (
	"context"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

type SiteBlockRepository struct {
	dbHolder
}

func NewSiteBlockRepository(db ...*gorm.DB) *SiteBlockRepository {
	var explicit *gorm.DB
	if len(db) > 0 {
		explicit = db[0]
	}
	return &SiteBlockRepository{dbHolder{explicit: explicit}}
}

func (r *SiteBlockRepository) Transaction(ctx context.Context, fn func(*UnitOfWork) error) error {
	return r.transaction(ctx, fn)
}

func (r *SiteBlockRepository) List(ctx context.Context) ([]models.SiteBlock, error) {
	var blocks []models.SiteBlock
	err := r.db(ctx).Order("id ASC").Find(&blocks).Error
	return blocks, err
}

func (r *SiteBlockRepository) FindByName(ctx context.Context, name string) (models.SiteBlock, error) {
	var block models.SiteBlock
	err := r.db(ctx).Where("name = ?", name).First(&block).Error
	return block, err
}

func (r *SiteBlockRepository) Create(ctx context.Context, block *models.SiteBlock) error {
	return r.db(ctx).Create(block).Error
}

func (r *SiteBlockRepository) Upsert(ctx context.Context, block *models.SiteBlock) error {
	var existing models.SiteBlock
	err := r.db(ctx).Where("name = ?", block.Name).First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		return r.Create(ctx, block)
	}
	if err != nil {
		return err
	}
	content := block.Content
	if err := r.db(ctx).Model(&existing).Update("content", content).Error; err != nil {
		return err
	}
	*block = existing
	block.Content = content
	return nil
}

func (r *SiteBlockRepository) Delete(ctx context.Context, id uint) error {
	return r.db(ctx).Delete(&models.SiteBlock{}, id).Error
}
