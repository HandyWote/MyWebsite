package repositories

import (
	"context"
	"time"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MediaDeleteRepository struct {
	dbHolder
}

func NewMediaDeleteRepository(db ...*gorm.DB) *MediaDeleteRepository {
	var explicit *gorm.DB
	if len(db) > 0 {
		explicit = db[0]
	}
	return &MediaDeleteRepository{dbHolder{explicit: explicit}}
}

func (r *MediaDeleteRepository) Enqueue(ctx context.Context, key, message string, now time.Time) error {
	task := models.MediaDeleteTask{ObjectKey: key, LastError: message, NextAttemptAt: now}
	return r.db(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "object_key"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"last_error": message, "next_attempt_at": now, "processed_at": nil,
		}),
	}).Create(&task).Error
}

func (r *MediaDeleteRepository) FindDue(ctx context.Context, now time.Time, limit int) ([]models.MediaDeleteTask, error) {
	var tasks []models.MediaDeleteTask
	err := r.db(ctx).Where("processed_at IS NULL AND next_attempt_at <= ?", now).Order("id ASC").Limit(limit).Find(&tasks).Error
	return tasks, err
}

func (r *MediaDeleteRepository) MarkProcessed(ctx context.Context, id uint, now time.Time) error {
	return r.db(ctx).Model(&models.MediaDeleteTask{}).Where("id = ?", id).Updates(map[string]interface{}{"processed_at": now, "last_error": ""}).Error
}

func (r *MediaDeleteRepository) MarkFailed(ctx context.Context, id uint, attempts int, next time.Time, message string) error {
	return r.db(ctx).Model(&models.MediaDeleteTask{}).Where("id = ?", id).Updates(map[string]interface{}{
		"attempts": attempts, "next_attempt_at": next, "last_error": message,
	}).Error
}
