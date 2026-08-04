package repositories

import (
	"context"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

type AISettingRepository struct {
	dbHolder
}

func NewAISettingRepository(db ...*gorm.DB) *AISettingRepository {
	var explicit *gorm.DB
	if len(db) > 0 {
		explicit = db[0]
	}
	return &AISettingRepository{dbHolder{explicit: explicit}}
}

func (r *AISettingRepository) Get(ctx context.Context) (models.AISetting, error) {
	var setting models.AISetting
	err := r.db(ctx).First(&setting).Error
	return setting, err
}

func (r *AISettingRepository) Save(ctx context.Context, input models.AISetting) (models.AISetting, error) {
	setting, err := r.Get(ctx)
	if err == gorm.ErrRecordNotFound {
		if err := r.db(ctx).Create(&input).Error; err != nil {
			return models.AISetting{}, err
		}
		return input, nil
	}
	if err != nil {
		return models.AISetting{}, err
	}

	fields := map[string]interface{}{
		"prompt":   input.Prompt,
		"model":    input.Model,
		"base_url": input.BaseURL,
	}
	if input.APIKey != "" {
		fields["api_key"] = input.APIKey
	}
	if err := r.db(ctx).Model(&setting).Updates(fields).Error; err != nil {
		return models.AISetting{}, err
	}
	return r.Get(ctx)
}
