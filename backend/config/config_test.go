package config

import (
	"os"
	"testing"
	"github.com/stretchr/testify/assert"
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

func TestLoadConfig_MaxContentLengthDefault(t *testing.T) {
	os.Unsetenv("MAX_CONTENT_LENGTH")

	config := LoadConfig()

	assert.Equal(t, int64(52428800), config.MaxContentLength, "默认上传限制应为 50MB")
}
