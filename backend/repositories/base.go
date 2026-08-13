package repositories

import (
	"context"

	"github.com/handywote/website/database"
	"gorm.io/gorm"
)

type dbHolder struct {
	explicit *gorm.DB
}

func (h dbHolder) db(ctx context.Context) *gorm.DB {
	db := h.explicit
	if db == nil {
		db = database.GetDB()
	}
	if ctx != nil {
		return db.WithContext(ctx)
	}
	return db
}

// UnitOfWork exposes only domain repositories bound to one transaction.
type UnitOfWork struct {
	Articles   *ArticleRepository
	Comments   *CommentRepository
	SiteBlocks *SiteBlockRepository
	Avatars    *AvatarRepository
	AISettings *AISettingRepository
	Outbox     *RevalidationOutboxRepository
	Users      *UserRepository
}

func newUnitOfWork(tx *gorm.DB) *UnitOfWork {
	return &UnitOfWork{
		Articles:   NewArticleRepository(tx),
		Comments:   NewCommentRepository(tx),
		SiteBlocks: NewSiteBlockRepository(tx),
		Avatars:    NewAvatarRepository(tx),
		AISettings: NewAISettingRepository(tx),
		Outbox:     NewRevalidationOutboxRepository(tx),
		Users:      NewUserRepository(tx),
	}
}

func (h dbHolder) transaction(ctx context.Context, fn func(*UnitOfWork) error) error {
	return h.db(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(newUnitOfWork(tx))
	})
}
