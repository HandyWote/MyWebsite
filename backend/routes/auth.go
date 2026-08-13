package routes

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/utils"
)

// loginRateLimitKey 构造密码登录限流的 key：客户端 IP + ":" + username。
// IP 取 X-Forwarded-For 首值（反代部署下客户端真实 IP），无该头时回退 c.ClientIP()。
func loginRateLimitKey(c *gin.Context, username string) string {
	xff := c.GetHeader("X-Forwarded-For")
	if xff != "" {
		if idx := strings.IndexByte(xff, ','); idx >= 0 {
			xff = xff[:idx]
		}
		if ip := strings.TrimSpace(xff); ip != "" {
			return ip + ":" + username
		}
	}
	return c.ClientIP() + ":" + username
}

// Login 登录（管理员，env 凭据）。
//
// 接入密码登录限流（P1 决策 8）：key = IP + ":" + username，窗口内失败达到
// LOGIN_RATE_LIMIT_MAX 次即返回 429，直到 LOGIN_RATE_LIMIT_WINDOW_MINUTES
// 窗口过期；登录成功 Reset 计数。限流器由 configureServices 按 cfg 实例化
// （依赖注入），测试可整体替换 loginLimiter 注入可控时钟。
func Login(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	key := loginRateLimitKey(c, input.Username)
	if loginLimiter.IsBlocked(key) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many attempts, try again later"})
		return
	}

	cfg := config.LoadConfig()

	if input.Username == cfg.AdminUsername && input.Password == cfg.AdminPassword {
		loginLimiter.Reset(key)
		token, err := middleware.GenerateToken(input.Username, "password", cfg.JWTSecretKey, cfg.JWTAccessTokenExpires)
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

	loginLimiter.RecordFailure(key)
	utils.ErrorUnauthorized(c, "Invalid username or password")
}

// Logout 登出（JWT 状态下客户端删除 token 即可）
func Logout(c *gin.Context) {
	// JWT 无状态，登出只需要通知客户端删除 token
	utils.Success(c, gin.H{"message": "Logout successful"})
}

// meUserLookup 按 (provider, username) 查 users 表，为 /api/auth/me 补全
// GitHub 用户的展示字段。默认走真实仓库；测试整体替换以避免 DB 依赖
// （模式同 github_oauth.go 的 githubUserUpserter）。
var meUserLookup = func(ctx context.Context, provider, username string) (*models.User, error) {
	return repositories.NewUserRepository().FindByUsername(ctx, provider, username)
}

// Me 获取当前登录用户信息（可选鉴权，public 组，不要求 provider=password，
// GitHub 用户同样可查）。
//
// 有有效 Bearer token → 200 {username, provider, display_name?, avatar_url?}：
// GitHub 用户尽力从 users 表补全展示字段（查不到/查询失败只回
// username/provider，身份结果不依赖 users 表），管理员（provider=password，
// 含无 provider 的旧 token）只回 username/provider；
// 无 token 或 token 无效 → 401 {"error":"not authenticated"}。
func Me(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader || tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	cfg := config.LoadConfig()
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecretKey), nil
	})
	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	// 旧 token（升级前签发）没有 provider 字段，按 "password" 兼容，与 JWTAuth 一致。
	provider := claims.Provider
	if provider == "" {
		provider = "password"
	}

	data := gin.H{
		"username": claims.Username,
		"provider": provider,
	}
	if provider == "github" {
		if user, lookupErr := meUserLookup(c.Request.Context(), provider, claims.Username); lookupErr == nil && user != nil {
			if user.DisplayName != "" {
				data["display_name"] = user.DisplayName
			}
			if user.AvatarURL != "" {
				data["avatar_url"] = user.AvatarURL
			}
		}
	}

	utils.Success(c, data)
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
