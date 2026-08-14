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

// commentIdentityUser 解析可选的 Bearer token，返回 GitHub 登录用户；
// 无 token / token 无效 / 非 github provider（admin 等）一律返回 nil，匿名评论照旧。
func commentIdentityUser(c *gin.Context) *models.User {
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
	if err != nil || !token.Valid || claims.Provider != "github" {
		return nil
	}

	user, lookupErr := meUserLookup(c.Request.Context(), claims.Provider, claims.Username)
	if lookupErr != nil {
		return nil
	}
	return user
}

// CreateComment 创建评论
func CreateComment(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	var input struct {
		Author  string `json:"author" binding:"required"`
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
		Author:    input.Author,
		Email:     input.Email,
		Content:   input.Content,
		IPAddress: identityIP,
		UserAgent: c.GetHeader("User-Agent"),
		Status:    "pending",
	}

	// GitHub 登录用户评论：用服务端身份覆盖 author/头像（防伪造），匿名评论保留手填。
	if identity := commentIdentityUser(c); identity != nil {
		comment.Author = identity.DisplayName
		if comment.Author == "" {
			comment.Author = identity.Username
		}
		comment.AvatarURL = identity.AvatarURL
	}

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
