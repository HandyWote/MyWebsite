package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestJWTAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// 创建有效token
	claims := jwt.MapClaims{
		"username": "admin",
		"exp":      time.Now().Add(time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte("test-secret"))

	// 测试有效token
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/", nil)
	c.Request.Header.Set("Authorization", "Bearer "+tokenString)

	JWTAuth("test-secret")(c)

	// 验证username已设置
	username, exists := c.Get("username")
	assert.True(t, exists)
	assert.Equal(t, "admin", username)

	// 测试无效token
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = httptest.NewRequest("GET", "/", nil)
	c2.Request.Header.Set("Authorization", "Bearer invalid-token")

	JWTAuth("test-secret")(c2)

	// 应该有错误响应
	assert.True(t, c2.IsAborted())
	assert.Equal(t, 401, w2.Code)
}

func TestJWTAuthNoToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/", nil)

	JWTAuth("test-secret")(c)

	// 应该有错误响应
	assert.True(t, c.IsAborted())
	assert.Equal(t, 401, w.Code)
}

func TestGenerateToken(t *testing.T) {
	token, err := GenerateToken("admin", "secret", 3600)
	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	// 验证token
	parsed, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		return []byte("secret"), nil
	})
	assert.NoError(t, err)
	assert.True(t, parsed.Valid)

	claims := parsed.Claims.(jwt.MapClaims)
	assert.Equal(t, "admin", claims["username"])
}
