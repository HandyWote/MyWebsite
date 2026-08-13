package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string
	DBSchema   string
	Port       string

	SecretKey    string
	JWTSecretKey string

	AdminUsername string
	AdminPassword string

	UploadFolder           string
	MaxContentLength       int64
	AllowedImageExtensions []string

	StorageDriver    string
	S3Endpoint       string
	S3Region         string
	S3Bucket         string
	S3AccessKeyID    string
	S3SecretKey      string
	S3PublicBaseURL  string
	S3ForcePathStyle bool

	RevalidationURL    string
	RevalidationToken  string
	CORSAllowedOrigins []string

	OpenAIAPIKey string
	OpenAIModel  string
	OpenAIAPIURL string

	JWTAccessTokenExpires   int
	JWTRememberTokenExpires int

	GithubOAuthClientID     string
	GithubOAuthClientSecret string
	GithubOAuthRedirectURI  string

	LoginRateLimitMax           int
	LoginRateLimitWindowMinutes int

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
		DBSchema:   getEnv("DB_SCHEMA", "public"),
		Port:       getEnv("PORT", "5000"),

		SecretKey:    getEnv("SECRET_KEY", "dev-secret-key-change-in-production"),
		JWTSecretKey: getEnv("JWT_SECRET_KEY", "dev-jwt-secret-change-in-production"),

		AdminUsername: getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin123"),

		UploadFolder:           getEnv("UPLOAD_FOLDER", "uploads"),
		MaxContentLength:       getEnvInt64("MAX_CONTENT_LENGTH", 52428800),
		AllowedImageExtensions: []string{"jpg", "jpeg", "png", "webp"},

		StorageDriver:    strings.ToLower(getEnv("STORAGE_DRIVER", "local")),
		S3Endpoint:       getEnv("S3_ENDPOINT", ""),
		S3Region:         getEnv("S3_REGION", "us-east-1"),
		S3Bucket:         getEnv("S3_BUCKET", ""),
		S3AccessKeyID:    getEnv("S3_ACCESS_KEY_ID", ""),
		S3SecretKey:      getEnv("S3_SECRET_ACCESS_KEY", ""),
		S3PublicBaseURL:  getEnv("S3_PUBLIC_BASE_URL", ""),
		S3ForcePathStyle: getEnv("S3_FORCE_PATH_STYLE", "false") == "true",

		RevalidationURL:    getEnv("NEXT_REVALIDATION_URL", ""),
		RevalidationToken:  getEnv("REVALIDATION_TOKEN", ""),
		CORSAllowedOrigins: splitCSV(getOptionalEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")),

		OpenAIAPIKey: getEnv("OPENAI_API_KEY", ""),
		OpenAIModel:  getEnv("OPENAI_MODEL", "gpt-3.5-turbo"),
		OpenAIAPIURL: getEnv("OPENAI_API_URL", "https://api.openai.com/v1"),

		JWTAccessTokenExpires:   getEnvInt("JWT_ACCESS_TOKEN_EXPIRES", 86400),
		JWTRememberTokenExpires: getEnvInt("JWT_REMEMBER_TOKEN_EXPIRES", 604800),

		GithubOAuthClientID:     getEnv("GITHUB_OAUTH_CLIENT_ID", ""),
		GithubOAuthClientSecret: getEnv("GITHUB_OAUTH_CLIENT_SECRET", ""),
		GithubOAuthRedirectURI:  getEnv("GITHUB_OAUTH_REDIRECT_URI", ""),

		LoginRateLimitMax:           getEnvInt("LOGIN_RATE_LIMIT_MAX", 5),
		LoginRateLimitWindowMinutes: getEnvInt("LOGIN_RATE_LIMIT_WINDOW_MINUTES", 15),

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

func getOptionalEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
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

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if origin := strings.TrimSpace(part); origin != "" && origin != "*" {
			result = append(result, strings.TrimRight(origin, "/"))
		}
	}
	return result
}
