package config

import (
	"os"
	"strconv"
	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string

	SecretKey    string
	JWTSecretKey string

	AdminUsername string
	AdminPassword string

	UploadFolder         string
	MaxContentLength     int64
	AllowedImageExtensions []string

	OpenAIAPIKey    string
	OpenAIModel     string
	OpenAIAPIURL    string

	JWTAccessTokenExpires  int
	JWTRememberTokenExpires int

	CommentLimitEnabled     bool
	CommentLimitTimeWindow  int
	CommentLimitMaxCount    int
	CommentLimitExemptAdmin bool
}

func LoadConfig() *Config {
	godotenv.Load()

	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnvInt("DB_PORT", 5432),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "password"),
		DBName:     getEnv("DB_NAME", "mywebsite"),

		SecretKey:    getEnv("SECRET_KEY", "dev-secret-key"),
		JWTSecretKey: getEnv("JWT_SECRET_KEY", "dev-jwt-secret"),

		AdminUsername: getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin123"),

		UploadFolder:         getEnv("UPLOAD_FOLDER", "uploads"),
		MaxContentLength:     getEnvInt64("MAX_CONTENT_LENGTH", 52428800),
		AllowedImageExtensions: []string{"jpg", "jpeg", "png", "webp"},

		OpenAIAPIKey:  getEnv("OPENAI_API_KEY", "sk-xxxx"),
		OpenAIModel:   getEnv("OPENAI_MODEL", "gpt-3.5-turbo"),
		OpenAIAPIURL:  getEnv("OPENAI_API_URL", "https://api.openai.com/v1"),

		JWTAccessTokenExpires:  getEnvInt("JWT_ACCESS_TOKEN_EXPIRES", 86400),
		JWTRememberTokenExpires: getEnvInt("JWT_REMEMBER_TOKEN_EXPIRES", 604800),

		CommentLimitEnabled:     getEnv("COMMENT_LIMIT_ENABLED", "true") == "true",
		CommentLimitTimeWindow:  getEnvInt("COMMENT_LIMIT_TIME_WINDOW", 24),
		CommentLimitMaxCount:    getEnvInt("COMMENT_LIMIT_MAX_COUNT", 1),
		CommentLimitExemptAdmin: getEnv("COMMENT_LIMIT_EXEMPT_ADMIN", "true") == "true",
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intVal
		}
	}
	return defaultValue
}
