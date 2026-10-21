package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

// maxCanvasStrokes 画布全量笔画硬上限:超出时 AppendStrokes 裁掉最旧部分,
// 防止无限追加把单行 text 撑爆。与路由层投稿校验的笔画数上限保持同一量级。
const maxCanvasStrokes = 2000

// ErrDrawingVersionConflict 乐观锁仲裁失败:调用方持有的 base_version 已不等于
// 画布当前版本(有并发写入抢先推进),本笔追加被拒绝。调用方用 errors.Is 判定,
// 映射 409 契约。
var ErrDrawingVersionConflict = errors.New("drawing version conflict")

// ErrDrawingSubmissionNotPending 投稿已被审核(或被并发审核抢先),不再处于
// pending,重复审核被拒绝。调用方用 errors.Is 判定,映射 400 契约。
var ErrDrawingSubmissionNotPending = errors.New("drawing submission not pending")

// ErrDrawingBaseSuperseded 投稿基于的画布版本已被并发写入推进,本稿作废
// (标 superseded 后拒绝合并)。调用方用 errors.Is 判定,映射 409 契约。
var ErrDrawingBaseSuperseded = errors.New("drawing base version superseded")

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

// appendVersionSQL 单语句条件插入:仅当画布当前版本(无行视为 0)仍等于
// expectedVersion 时写入 version=expectedVersion+1 的新行。INSERT..SELECT..
// WHERE 形式在 PostgreSQL 与 SQLite 上均可移植(不用 FOR UPDATE);WHERE
// 不成立 → 零行插入,由 RowsAffected==0 判定冲突。Version 唯一索引兜底:
// 并发下两个事务都通过 WHERE 时,后提交者撞唯一索引整体回滚,同样安全。
const appendVersionSQL = `
INSERT INTO drawing_versions (version, strokes, created_by, created_at, updated_at)
SELECT ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE COALESCE((SELECT MAX(version) FROM drawing_versions), 0) = ?`

// mergeStrokes 把 incoming 追加进 current 全量快照(无行时 current 传 "[]"),
// 总数超 maxCanvasStrokes 裁掉最旧部分,返回编码后的全量 JSON。
func mergeStrokes(current, incoming string) (string, error) {
	parsed := []json.RawMessage{}
	if err := json.Unmarshal([]byte(incoming), &parsed); err != nil {
		return "", fmt.Errorf("parse incoming strokes: %w", err)
	}
	existing := []json.RawMessage{}
	if err := json.Unmarshal([]byte(current), &existing); err != nil {
		return "", fmt.Errorf("parse existing strokes: %w", err)
	}
	merged := append(existing, parsed...)
	if overflow := len(merged) - maxCanvasStrokes; overflow > 0 {
		// 裁掉最旧的超出部分,保留最新 maxCanvasStrokes 笔。
		merged = merged[overflow:]
	}
	encoded, err := json.Marshal(merged)
	if err != nil {
		return "", fmt.Errorf("encode merged strokes: %w", err)
	}
	return string(encoded), nil
}

// AppendStrokes 乐观锁追加:调用方传入读到的 base 版本(expectedVersion),
// 事务内单语句条件插入仲裁——当前版本仍等于 expectedVersion 才写入
// version=expectedVersion+1;否则零行插入,返回 ErrDrawingVersionConflict。
// 全量快照在事务外基于读到的当前版本行拼装,冲突时不落任何数据。
func (r *DrawingRepository) AppendStrokes(ctx context.Context, expectedVersion uint, strokesJSON, createdBy string) (models.DrawingVersion, error) {
	var current models.DrawingVersion
	current, err := r.CurrentVersion(ctx)
	if err != nil {
		return models.DrawingVersion{}, err
	}

	merged, err := mergeStrokes(current.Strokes, strokesJSON)
	if err != nil {
		return models.DrawingVersion{}, err
	}

	var result models.DrawingVersion
	err = r.db(ctx).Transaction(func(tx *gorm.DB) error {
		next := expectedVersion + 1
		res := tx.Exec(appendVersionSQL, next, merged, createdBy, expectedVersion)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			// 画布已被并发写入推进:本笔作废,由调用方按冲突契约处理。
			return ErrDrawingVersionConflict
		}
		result = models.DrawingVersion{Version: next, Strokes: merged, CreatedBy: createdBy}
		return nil
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

// ApproveSubmission 单事务原子通过投稿,消除"画布已发布但投稿仍 pending"的
// 半发布态与并发重复发布:
//  1. 校验投稿仍 pending(条件更新 RowsAffected 仲裁,不依赖 FOR UPDATE);
//  2. 校验投稿 base_version 仍等于画布当前版本(事务内读画布现值整行,
//     base 仲裁与合并基线同源),落后则标 superseded 并提交、
//     返回 ErrDrawingBaseSuperseded(gorm 事务遇错即回滚,故 superseded 改写
//     随 nil 提交,哨兵在事务外转换);
//  3. 与 AppendStrokes 同款单语句条件插入发布新版本;
//  4. 条件更新把 pending → approved,零行说明被并发审核抢先 → 整体回滚返回
//     ErrDrawingSubmissionNotPending。
//
// 任一步失败整体回滚:要么画布推进且投稿 approved,要么两者都不变(或仅作废)。
func (r *DrawingRepository) ApproveSubmission(ctx context.Context, submissionID uint, expectedBaseVersion uint, reviewer string) (models.DrawingSubmission, error) {
	var approved models.DrawingSubmission
	superseded := false
	err := r.db(ctx).Transaction(func(tx *gorm.DB) error {
		// 事务内重读:拿到提交时刻的投稿与 base,避免用事务外的旧值仲裁。
		var submission models.DrawingSubmission
		if err := tx.First(&submission, submissionID).Error; err != nil {
			return err
		}

		if submission.Status != "pending" {
			return ErrDrawingSubmissionNotPending
		}

		var currentRow models.DrawingVersion
		if err := tx.Order("version DESC").First(&currentRow).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			// 空画布(无任何版本行):合并基线就是空数组。
			currentRow = models.DrawingVersion{Version: 0, Strokes: "[]"}
		}
		base := currentRow.Version
		if submission.BaseVersion != base {
			// base 落后:标记 superseded(随事务提交),投稿不合并。
			res := tx.Model(&models.DrawingSubmission{}).
				Where("id = ? AND status = ?", submissionID, "pending").
				Updates(map[string]interface{}{
					"status":      "superseded",
					"reviewed_by": reviewer,
					"reviewed_at": time.Now(),
				})
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return ErrDrawingSubmissionNotPending
			}
			superseded = true
			return nil
		}

		// 合并基线取事务内读到的画布现值整行(工单 #9):发布的是「存量+
		// 投稿增量」整体快照,不能只含投稿笔画(那会把公共画布历史清空);
		// base 匹配时该行就是被合并的存量,与路由侧审核输入同源一致。
		merged, err := mergeStrokes(currentRow.Strokes, submission.Strokes)
		if err != nil {
			return err
		}

		next := expectedBaseVersion + 1
		res := tx.Exec(appendVersionSQL, next, merged, submission.CreatedBy, expectedBaseVersion)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return ErrDrawingVersionConflict
		}

		// pending → approved 条件更新:零行说明被并发审核抢先,回滚发布。
		res = tx.Model(&models.DrawingSubmission{}).
			Where("id = ? AND status = ?", submissionID, "pending").
			Updates(map[string]interface{}{
				"status":      "approved",
				"reviewed_by": reviewer,
				"reviewed_at": time.Now(),
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return ErrDrawingSubmissionNotPending
		}

		if err := tx.First(&approved, submissionID).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return models.DrawingSubmission{}, err
	}
	if superseded {
		return models.DrawingSubmission{}, ErrDrawingBaseSuperseded
	}
	return approved, nil
}
