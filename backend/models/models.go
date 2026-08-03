package models

import (
	"time"

	"gorm.io/gorm"
)

type Article struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Title       string         `gorm:"size:128;not null" json:"title"`
	Category    string         `gorm:"size:64" json:"category"`
	Tags        string         `gorm:"size:256" json:"tags"`
	Cover       string         `gorm:"size:256" json:"cover"`
	Summary     string         `gorm:"type:text" json:"summary"`
	Content     string         `gorm:"type:text" json:"content"`
	ContentType string         `gorm:"size:16;default:markdown" json:"content_type"`
	PDFFilename string         `gorm:"size:256" json:"pdf_filename"` // 显式映射到 pdf_filename 列
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

func (Article) TableName() string {
	return "article"
}

type Comment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ArticleID uint      `gorm:"index;not null" json:"article_id"`
	Author    string    `gorm:"size:100;not null" json:"author"`
	Email     string    `gorm:"size:255" json:"email"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	IPAddress string    `gorm:"size:45" json:"ip_address"`   // 记录IP地址
	UserAgent string    `gorm:"type:text" json:"user_agent"`  // 记录用户代理
	Status    string    `gorm:"size:20;default:normal" json:"status"` // normal, pending, spam
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Comment) TableName() string {
	return "comments"
}

type Avatar struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Filename    string         `gorm:"size:256;not null" json:"filename"`
	IsCurrent   bool           `gorm:"default:false" json:"is_current"`
	CroppedInfo *string        `gorm:"type:jsonb" json:"cropped_info"`
	UploadedAt  time.Time      `json:"uploaded_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

func (Avatar) TableName() string {
	return "avatar"
}

type SiteBlock struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:64;uniqueIndex;not null" json:"name"`
	Content   string    `gorm:"type:jsonb" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SiteBlock) TableName() string {
	return "site_block"
}

type AISetting struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Prompt    string    `gorm:"type:text" json:"prompt"`
	Model     string    `gorm:"size:128" json:"model"`
	BaseURL   string    `gorm:"size:255" json:"base_url"`
	APIKey    string    `gorm:"size:255" json:"api_key"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (AISetting) TableName() string {
	return "ai_settings"
}
