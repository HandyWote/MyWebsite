package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/utils"
)

// Login 登录
func Login(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	cfg := config.LoadConfig()

	if input.Username == cfg.AdminUsername && input.Password == cfg.AdminPassword {
		token, err := middleware.GenerateToken(input.Username, cfg.JWTSecretKey, cfg.JWTAccessTokenExpires)
		if err != nil {
			utils.ErrorInternal(c, "Failed to generate token")
			return
		}

		utils.Success(c, gin.H{
			"token": token,
			"user": gin.H{
				"username": input.Username,
			},
		})
		return
	}

	utils.ErrorUnauthorized(c, "Invalid username or password")
}

// Logout 登出（JWT 状态下客户端删除 token 即可）
func Logout(c *gin.Context) {
	// JWT 无状态，登出只需要通知客户端删除 token
	utils.Success(c, gin.H{"message": "Logout successful"})
}

// GetCurrentUser 获取当前登录用户信息
func GetCurrentUser(c *gin.Context) {
	// 从 JWT claims 获取用户名
	username, exists := c.Get("username")
	if !exists {
		utils.ErrorUnauthorized(c, "Not authenticated")
		return
	}

	utils.Success(c, gin.H{
		"username": username,
	})
}
