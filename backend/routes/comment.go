package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/models"
	"github.com/handywote/website/utils"
)

// GetComments 获取文章评论
func GetComments(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	comments, err := commentService.ListByArticle(id)
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch comments")
		return
	}

	utils.Success(c, gin.H{
		"comments": comments,
		"total":    len(comments),
	})
}

// commentSessionUser 解析会话身份（可选 Bearer token）：
// 无 Authorization 头 / 非 Bearer / token 解析失败 → nil（未登录）；
// provider=github → 尽力从 users 表补全展示字段（查询失败保守拒绝；
// 查不到用户时以 claims.Username 兜底，JWT 本身可信，与 Me handler 容错精神一致）；
// provider=password（含无 provider 的旧 token，与 middleware.JWTAuth 一致）→
// 管理员身份（cfg.AdminUsername），无头像。
func commentSessionUser(c *gin.Context) *models.User {
	authHeader := c.GetHeader("Authorization")
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader || tokenString == "" {
		return nil
	}

	cfg := config.LoadConfig()
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecretKey), nil
	})
	if err != nil || !token.Valid {
		return nil
	}

	switch claims.Provider {
	case "github":
		user, lookupErr := meUserLookup(c.Request.Context(), claims.Provider, claims.Username)
		if lookupErr != nil {
			return nil
		}
		if user == nil {
			// users 表查不到：JWT 本身可信，回退 claims.Username 作作者。
			return &models.User{Provider: "github", Username: claims.Username}
		}
		return user
	default:
		// 旧 token（无 provider 字段）按 "password" 兼容，与 middleware.JWTAuth 一致。
		return &models.User{
			Provider:    "password",
			Username:    cfg.AdminUsername,
			DisplayName: cfg.AdminUsername,
		}
	}
}

// CreateComment 创建评论（需登录：GitHub 用户或管理员，见 commentSessionUser）
func CreateComment(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	// 会话鉴权在限流/入库之前：未登录一律 401。
	identity := commentSessionUser(c)
	if identity == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录后再评论"})
		return
	}

	var input struct {
		Author  string `json:"author"` // 客户端提交的作者名不再被信任，服务端恒覆盖
		Email   string `json:"email"`
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	cfg := config.LoadConfig()
	identityEmail := strings.TrimSpace(input.Email)
	identityIP := strings.TrimSpace(c.ClientIP())
	identifier := buildCommentLimiterIdentity(identityEmail, identityIP)

	// 评论限制检查 - 按小时且按用户维度
	if cfg.CommentLimitEnabled {
		hoursAgo := time.Now().Add(-time.Duration(cfg.CommentLimitTimeWindow) * time.Hour)
		var count int64
		var err error
		switch {
		case identityEmail != "":
			count, err = commentService.CountRecentBy("email", identityEmail, hoursAgo)
		case identityIP != "":
			count, err = commentService.CountRecentBy("ip_address", identityIP, hoursAgo)
		default:
			count, err = commentService.CountRecentBy("author", identifier, hoursAgo)
		}
		if err == nil && count >= int64(cfg.CommentLimitMaxCount) {
			c.JSON(http.StatusTooManyRequests, utils.Response{
				Code:    http.StatusTooManyRequests,
				Message: "评论次数已达上限，请稍后再试",
			})
			return
		}
	}

	comment := models.Comment{
		ArticleID: id,
		Author:    identity.DisplayName,
		Email:     input.Email,
		Content:   input.Content,
		IPAddress: identityIP,
		UserAgent: c.GetHeader("User-Agent"),
		Status:    "pending",
	}
	// 身份字段一律取服务端会话身份（防伪造）：DisplayName 为空时回退 Username；
	// 头像仅 GitHub 用户有（users 表），管理员无头像。
	if comment.Author == "" {
		comment.Author = identity.Username
	}
	comment.AvatarURL = identity.AvatarURL

	if err := commentService.Create(&comment); err != nil {
		utils.ErrorInternal(c, "Failed to create comment")
		return
	}

	utils.Success(c, comment)
}

func buildCommentLimiterIdentity(email, ip string) string {
	if email != "" {
		return email
	}
	if ip != "" {
		return ip
	}
	return "anonymous"
}
