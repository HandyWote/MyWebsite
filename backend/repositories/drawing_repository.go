package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

// maxCanvasStrokes 画布全量笔画硬上限:超出时 AppendStrokes 裁掉最旧部分,
// 防止无限追加把单行 text 撑爆。与路由层投稿校验的笔画数上限保持同一量级。
const maxCanvasStrokes = 2000

type DrawingRepository struct {
	dbHolder
}

func NewDrawingRepository(db ...*gorm.DB) *DrawingRepository {
	var explicit *gorm.DB
	if len(db) > 0 {
		explicit = db[0]
	}
	return &DrawingRepository{dbHolder{explicit: explicit}}
}

// CurrentVersion 返回画布当前版本。无任何记录时返回 version=0、strokes 空
// 数组编码,这是"空画布"的合法初始态,不算错误。
func (r *DrawingRepository) CurrentVersion(ctx context.Context) (models.DrawingVersion, error) {
	var version models.DrawingVersion
	err := r.db(ctx).Order("version DESC").First(&version).Error
	if err == gorm.ErrRecordNotFound {
		return models.DrawingVersion{Version: 0, Strokes: "[]"}, nil
	}
	if err != nil {
		return models.DrawingVersion{}, err
	}
	return version, nil
}

// AppendStrokes 事务内读当前版本→拼接全量(总数超上限裁最旧)→version+1
// 写入新行。读端恒取最大 version,整行写入,所以读到的一直是完整一致快照;
// Version 唯一索引兜底极端并发(冲突方报错重试,单实例部署下概率可忽略)。
func (r *DrawingRepository) AppendStrokes(ctx context.Context, strokesJSON, createdBy string) (models.DrawingVersion, error) {
	var result models.DrawingVersion
	err := r.db(ctx).Transaction(func(tx *gorm.DB) error {
		var current models.DrawingVersion
		err := tx.Order("version DESC").First(&current).Error
		found := err == nil
		if err != nil && err != gorm.ErrRecordNotFound {
			return err
		}

		incoming := []json.RawMessage{}
		if err := json.Unmarshal([]byte(strokesJSON), &incoming); err != nil {
			return fmt.Errorf("parse incoming strokes: %w", err)
		}

		merged := incoming
		if found {
			existing := []json.RawMessage{}
			if err := json.Unmarshal([]byte(current.Strokes), &existing); err != nil {
				return fmt.Errorf("parse existing strokes: %w", err)
			}
			merged = append(existing, incoming...)
			if overflow := len(merged) - maxCanvasStrokes; overflow > 0 {
				// 裁掉最旧的超出部分,保留最新 maxCanvasStrokes 笔。
				merged = merged[overflow:]
			}
		}

		encoded, err := json.Marshal(merged)
		if err != nil {
			return fmt.Errorf("encode merged strokes: %w", err)
		}
		nextVersion := uint(1)
		if found {
			nextVersion = current.Version + 1
		}
		result = models.DrawingVersion{Version: nextVersion, Strokes: string(encoded), CreatedBy: createdBy}
		return tx.Create(&result).Error
	})
	if err != nil {
		return models.DrawingVersion{}, err
	}
	return result, nil
}

// CreateSubmission 落一条待审投稿记录。
func (r *DrawingRepository) CreateSubmission(ctx context.Context, submission *models.DrawingSubmission) error {
	return r.db(ctx).Create(submission).Error
}

// ListSubmissions 按 status 过滤(空串=不过滤),按创建时间倒序,limit<=0 取默认 50。
func (r *DrawingRepository) ListSubmissions(ctx context.Context, status string, limit int) ([]models.DrawingSubmission, int64, error) {
	if limit <= 0 {
		limit = 50
	}
	query := r.db(ctx).Model(&models.DrawingSubmission{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var submissions []models.DrawingSubmission
	err := query.Order("created_at DESC").Limit(limit).Find(&submissions).Error
	return submissions, total, err
}

// GetSubmission 返回指定投稿,gorm.ErrRecordNotFound 表示不存在。
func (r *DrawingRepository) GetSubmission(ctx context.Context, id uint) (models.DrawingSubmission, error) {
	var submission models.DrawingSubmission
	err := r.db(ctx).First(&submission, id).Error
	return submission, err
}

// UpdateSubmissionStatus 更新审核状态及审核人/时间。
func (r *DrawingRepository) UpdateSubmissionStatus(ctx context.Context, id uint, status, reviewedBy string, reviewedAt time.Time) error {
	return r.db(ctx).Model(&models.DrawingSubmission{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      status,
		"reviewed_by": reviewedBy,
		"reviewed_at": reviewedAt,
	}).Error
}
