package repositories

import (
	"context"
	"time"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

type RevalidationOutboxRepository struct {
	dbHolder
}

func NewRevalidationOutboxRepository(db ...*gorm.DB) *RevalidationOutboxRepository {
	var explicit *gorm.DB
	if len(db) > 0 {
		explicit = db[0]
	}
	return &RevalidationOutboxRepository{dbHolder{explicit: explicit}}
}

func (r *RevalidationOutboxRepository) Create(ctx context.Context, event *models.RevalidationOutbox) error {
	return r.db(ctx).Create(event).Error
}

func (r *RevalidationOutboxRepository) FindDue(ctx context.Context, now time.Time, limit int) ([]models.RevalidationOutbox, error) {
	var events []models.RevalidationOutbox
	err := r.db(ctx).Where("processed_at IS NULL AND next_attempt_at <= ?", now).
		Order("next_attempt_at ASC, id ASC").Limit(limit).Find(&events).Error
	return events, err
}

func (r *RevalidationOutboxRepository) MarkProcessed(ctx context.Context, id uint, at time.Time) error {
	return r.db(ctx).Model(&models.RevalidationOutbox{}).Where("id = ? AND processed_at IS NULL", id).Updates(map[string]interface{}{
		"processed_at": at,
		"last_error":   "",
	}).Error
}

func (r *RevalidationOutboxRepository) MarkFailed(ctx context.Context, id uint, attempts int, next time.Time, message string) error {
	return r.db(ctx).Model(&models.RevalidationOutbox{}).Where("id = ? AND processed_at IS NULL", id).Updates(map[string]interface{}{
		"attempts":        attempts,
		"next_attempt_at": next,
		"last_error":      message,
	}).Error
}

func (r *RevalidationOutboxRepository) Retry(ctx context.Context, ids []uint, now time.Time) (int64, error) {
	query := r.db(ctx).Model(&models.RevalidationOutbox{}).Where("processed_at IS NULL")
	if len(ids) > 0 {
		query = query.Where("id IN ?", ids)
	}
	result := query.Updates(map[string]interface{}{"next_attempt_at": now, "last_error": ""})
	return result.RowsAffected, result.Error
}

func (r *RevalidationOutboxRepository) Pending(ctx context.Context, limit int) ([]models.RevalidationOutbox, error) {
	var events []models.RevalidationOutbox
	err := r.db(ctx).Where("processed_at IS NULL").Order("next_attempt_at ASC, id ASC").Limit(limit).Find(&events).Error
	return events, err
}
