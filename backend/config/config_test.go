package config

import (
	"github.com/stretchr/testify/assert"
	"os"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	os.Setenv("DB_HOST", "testhost")
	os.Setenv("DB_PORT", "5433")

	config := LoadConfig()

	assert.Equal(t, "testhost", config.DBHost)
	assert.Equal(t, 5433, config.DBPort)
}

func TestLoadConfig_DefaultPort(t *testing.T) {
	os.Unsetenv("PORT")

	config := LoadConfig()

	assert.Equal(t, "5000", config.Port, "默认端口应为 5000")
}

func TestLoadConfig_PortFromEnv(t *testing.T) {
	os.Setenv("PORT", "3000")
	defer os.Unsetenv("PORT")

	config := LoadConfig()

	assert.Equal(t, "3000", config.Port)
}

func TestLoadConfig_OpenAIURLDefault(t *testing.T) {
	os.Unsetenv("OPENAI_API_URL")

	config := LoadConfig()

	assert.Equal(t, "https://api.openai.com/v1", config.OpenAIAPIURL)
}

func TestLoadConfig_DBSchema(t *testing.T) {
	os.Unsetenv("DB_SCHEMA")
	assert.Equal(t, "public", LoadConfig().DBSchema)

	t.Setenv("DB_SCHEMA", "web-test")
	assert.Equal(t, "web-test", LoadConfig().DBSchema)
}

func TestLoadConfig_MaxContentLengthDefault(t *testing.T) {
	os.Unsetenv("MAX_CONTENT_LENGTH")

	config := LoadConfig()

	assert.Equal(t, int64(52428800), config.MaxContentLength, "默认上传限制应为 50MB")
}

func TestLoadConfigStorageAndCORS(t *testing.T) {
	t.Setenv("STORAGE_DRIVER", "S3")
	t.Setenv("S3_FORCE_PATH_STYLE", "true")
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://admin.example.com, http://localhost:3000/ ,*")

	config := LoadConfig()
	assert.Equal(t, "s3", config.StorageDriver)
	assert.True(t, config.S3ForcePathStyle)
	assert.Equal(t, []string{"https://admin.example.com", "http://localhost:3000"}, config.CORSAllowedOrigins)
}

func TestLoadConfigAllowsEmptyCORSForProductionSameOrigin(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "")
	assert.Empty(t, LoadConfig().CORSAllowedOrigins)
}

func TestLoadConfig_GithubOAuthDefaults(t *testing.T) {
	os.Unsetenv("GITHUB_OAUTH_CLIENT_ID")
	os.Unsetenv("GITHUB_OAUTH_CLIENT_SECRET")
	os.Unsetenv("GITHUB_OAUTH_REDIRECT_URI")

	config := LoadConfig()

	assert.Equal(t, "", config.GithubOAuthClientID, "默认 GitHub OAuth Client ID 应为空")
	assert.Equal(t, "", config.GithubOAuthClientSecret, "默认 GitHub OAuth Client Secret 应为空")
	assert.Equal(t, "", config.GithubOAuthRedirectURI, "默认 GitHub OAuth 回调地址应为空")
}

func TestLoadConfig_GithubOAuthFromEnv(t *testing.T) {
	t.Setenv("GITHUB_OAUTH_CLIENT_ID", "test-client-id")
	t.Setenv("GITHUB_OAUTH_CLIENT_SECRET", "test-client-secret")
	t.Setenv("GITHUB_OAUTH_REDIRECT_URI", "https://example.com/api/auth/github/callback")

	config := LoadConfig()

	assert.Equal(t, "test-client-id", config.GithubOAuthClientID)
	assert.Equal(t, "test-client-secret", config.GithubOAuthClientSecret)
	assert.Equal(t, "https://example.com/api/auth/github/callback", config.GithubOAuthRedirectURI)
}

func TestLoadConfig_LoginRateLimitDefaults(t *testing.T) {
	os.Unsetenv("LOGIN_RATE_LIMIT_MAX")
	os.Unsetenv("LOGIN_RATE_LIMIT_WINDOW_MINUTES")

	config := LoadConfig()

	assert.Equal(t, 5, config.LoginRateLimitMax, "默认登录限流次数应为 5")
	assert.Equal(t, 15, config.LoginRateLimitWindowMinutes, "默认登录限流窗口应为 15 分钟")
}

func TestLoadConfig_LoginRateLimitFromEnv(t *testing.T) {
	t.Setenv("LOGIN_RATE_LIMIT_MAX", "10")
	t.Setenv("LOGIN_RATE_LIMIT_WINDOW_MINUTES", "30")

	config := LoadConfig()

	assert.Equal(t, 10, config.LoginRateLimitMax)
	assert.Equal(t, 30, config.LoginRateLimitWindowMinutes)
}
