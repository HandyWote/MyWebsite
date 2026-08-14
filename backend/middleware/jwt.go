package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Username string `json:"username"`
	Provider string `json:"provider"`
	jwt.RegisteredClaims
}

// JWTAuth JWT认证中间件
func JWTAuth(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(secretKey), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)

		// 旧 token（升级前签发）没有 provider 字段，按 "password" 兼容：
		// 旧系统只有管理员能拿到 token，升级不能中断现有会话。
		provider := claims.Provider
		if provider == "" {
			provider = "password"
		}
		c.Set("provider", provider)

		c.Next()
	}
}

// RequireAdmin 管理员校验中间件（需先经过 JWTAuth）
// 仅 provider 为 "password"（管理员）的 token 可访问 admin 路由；
// GitHub OAuth 用户（provider=github）一律拒绝。
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		provider, _ := c.Get("provider")
		if provider != "password" {
			c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// GenerateToken 生成JWT token
func GenerateToken(username, provider, secretKey string, expiresIn int) (string, error) {
	claims := Claims{
		Username: username,
		Provider: provider,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiresIn) * time.Second)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secretKey))
	if err != nil {
		return "", fmt.Errorf("sign JWT token: %w", err)
	}
	return signed, nil
}
