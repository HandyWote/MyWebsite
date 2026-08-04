package repositories

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrOutboxLeaseLost = errors.New("revalidation outbox lease lost")

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

func (r *RevalidationOutboxRepository) ClaimDue(ctx context.Context, now time.Time, limit int, lease time.Duration) ([]models.RevalidationOutbox, error) {
	if limit <= 0 {
		return []models.RevalidationOutbox{}, nil
	}
	if lease <= 0 {
		lease = time.Minute
	}
	token, err := newLeaseToken()
	if err != nil {
		return nil, err
	}
	leaseUntil := now.Add(lease)
	claimed := make([]models.RevalidationOutbox, 0, limit)
	err = r.db(ctx).Transaction(func(tx *gorm.DB) error {
		var candidates []models.RevalidationOutbox
		query := tx.Where("processed_at IS NULL AND next_attempt_at <= ? AND (lease_until IS NULL OR lease_until <= ?)", now, now).
			Order("next_attempt_at ASC, id ASC").Limit(limit)
		if tx.Dialector.Name() == "postgres" {
			query = query.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"})
		}
		if err := query.Find(&candidates).Error; err != nil {
			return err
		}
		for _, event := range candidates {
			result := tx.Model(&models.RevalidationOutbox{}).
				Where("id = ? AND processed_at IS NULL AND next_attempt_at <= ? AND (lease_until IS NULL OR lease_until <= ?)", event.ID, now, now).
				Updates(map[string]interface{}{"lease_until": leaseUntil, "lease_token": token})
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 1 {
				event.LeaseUntil = &leaseUntil
				event.LeaseToken = token
				claimed = append(claimed, event)
			}
		}
		return nil
	})
	return claimed, err
}

func (r *RevalidationOutboxRepository) MarkProcessed(ctx context.Context, id uint, leaseToken string, at time.Time) error {
	result := r.db(ctx).Model(&models.RevalidationOutbox{}).
		Where("id = ? AND processed_at IS NULL AND lease_token = ?", id, leaseToken).
		Updates(map[string]interface{}{
			"processed_at": at,
			"last_error":   "",
			"lease_until":  nil,
			"lease_token":  "",
		})
	return leaseResult(result)
}

func (r *RevalidationOutboxRepository) MarkFailed(ctx context.Context, id uint, leaseToken string, attempts int, next time.Time, message string) error {
	result := r.db(ctx).Model(&models.RevalidationOutbox{}).
		Where("id = ? AND processed_at IS NULL AND lease_token = ?", id, leaseToken).
		Updates(map[string]interface{}{
			"attempts":        attempts,
			"next_attempt_at": next,
			"last_error":      message,
			"lease_until":     nil,
			"lease_token":     "",
		})
	return leaseResult(result)
}

func (r *RevalidationOutboxRepository) Retry(ctx context.Context, ids []uint, now time.Time) (int64, error) {
	query := r.db(ctx).Model(&models.RevalidationOutbox{}).
		Where("processed_at IS NULL AND (lease_until IS NULL OR lease_until <= ?)", now)
	if len(ids) > 0 {
		query = query.Where("id IN ?", ids)
	}
	result := query.Updates(map[string]interface{}{
		"next_attempt_at": now,
		"last_error":      "",
		"lease_until":     nil,
		"lease_token":     "",
	})
	return result.RowsAffected, result.Error
}

func (r *RevalidationOutboxRepository) Pending(ctx context.Context, limit int) ([]models.RevalidationOutbox, error) {
	var events []models.RevalidationOutbox
	err := r.db(ctx).Where("processed_at IS NULL").Order("next_attempt_at ASC, id ASC").Limit(limit).Find(&events).Error
	return events, err
}

func leaseResult(result *gorm.DB) error {
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return ErrOutboxLeaseLost
	}
	return nil
}

func newLeaseToken() (string, error) {
	value := make([]byte, 16)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return hex.EncodeToString(value), nil
}
