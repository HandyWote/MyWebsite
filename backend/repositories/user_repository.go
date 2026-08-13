package repositories

import (
	"context"
	"time"

	"github.com/handywote/website/models"
	"gorm.io/gorm"
)

type UserRepository struct {
	dbHolder
}

func NewUserRepository(db ...*gorm.DB) *UserRepository {
	var explicit *gorm.DB
	if len(db) > 0 {
		explicit = db[0]
	}
	return &UserRepository{dbHolder{explicit: explicit}}
}

func (r *UserRepository) Transaction(ctx context.Context, fn func(*UnitOfWork) error) error {
	return r.transaction(ctx, fn)
}

// UpsertGitHubUser finds the GitHub user by provider_id, refreshing the
// display-only profile fields and LastLoginAt on each login; creates the user
// on first login. Returns the complete persisted User.
func (r *UserRepository) UpsertGitHubUser(ctx context.Context, providerID, username, displayName, avatarURL, email string) (*models.User, error) {
	user, err := r.FindByProviderID(ctx, "github", providerID)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}
	if err == nil {
		user.Username = username
		user.DisplayName = displayName
		user.AvatarURL = avatarURL
		user.Email = email
		user.LastLoginAt = time.Now()
		if err := r.db(ctx).Model(user).Updates(map[string]interface{}{
			"username":      user.Username,
			"display_name":  user.DisplayName,
			"avatar_url":    user.AvatarURL,
			"email":         user.Email,
			"last_login_at": user.LastLoginAt,
		}).Error; err != nil {
			return nil, err
		}
		return user, nil
	}
	user = &models.User{
		Provider:    "github",
		ProviderID:  providerID,
		Username:    username,
		DisplayName: displayName,
		AvatarURL:   avatarURL,
		Email:       email,
		LastLoginAt: time.Now(),
	}
	if err := r.db(ctx).Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// FindByProviderID returns the user matching provider + provider_id, or
// gorm.ErrRecordNotFound when absent.
func (r *UserRepository) FindByProviderID(ctx context.Context, provider, providerID string) (*models.User, error) {
	var user models.User
	err := r.db(ctx).Where("provider = ? AND provider_id = ?", provider, providerID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUsername returns the user matching provider + username, or
// gorm.ErrRecordNotFound when absent. Used by /api/auth/me to enrich GitHub
// profiles with display fields (username is display-only and refreshed on
// each login).
func (r *UserRepository) FindByUsername(ctx context.Context, provider, username string) (*models.User, error) {
	var user models.User
	err := r.db(ctx).Where("provider = ? AND username = ?", provider, username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}
