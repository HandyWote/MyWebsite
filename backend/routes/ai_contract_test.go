package routes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeAIAnalyzeResult_JSONAndFallback(t *testing.T) {
	jsonText := `{"category":"后端","tags":["Go","Gin"],"suggested_summary":"总结"}`
	res := normalizeAIAnalyzeResult(jsonText)
	assert.Equal(t, "后端", res["category"])
	assert.Equal(t, "总结", res["suggested_summary"])
	tags, ok := res["tags"].([]string)
	assert.True(t, ok)
	assert.Equal(t, []string{"Go", "Gin"}, tags)

	fallback := normalizeAIAnalyzeResult("plain text")
	assert.Equal(t, "", fallback["category"])
	assert.Equal(t, "plain text", fallback["suggested_summary"])
	fallbackTags, ok := fallback["tags"].([]string)
	assert.True(t, ok)
	assert.Len(t, fallbackTags, 0)
}

func TestNormalizeAIAnalyzeResult_FencedJSONAndAliases(t *testing.T) {
	raw := "```json\n{\"category\":\"  技术  \",\"tags\":\" Go, Gin ,  测试 \",\"summary\":\"  摘要  \"}\n```"
	res := normalizeAIAnalyzeResult(raw)

	assert.Equal(t, "技术", res["category"])
	assert.Equal(t, "摘要", res["suggested_summary"])
	tags, ok := res["tags"].([]string)
	assert.True(t, ok)
	assert.Equal(t, []string{"Go", "Gin", "测试"}, tags)
}

func TestMaskAPIKey(t *testing.T) {
	assert.Equal(t, "", maskAPIKey(""))
	assert.Equal(t, "****", maskAPIKey("short"))
	assert.Equal(t, "abcd****wxyz", maskAPIKey("abcd1234wxyz"))
}

func TestShouldIgnoreMaskedAPIKey(t *testing.T) {
	assert.False(t, shouldIgnoreAPIKeyUpdate(""))
	assert.False(t, shouldIgnoreAPIKeyUpdate("sk-real-key"))
	assert.True(t, shouldIgnoreAPIKeyUpdate("****"))
	assert.True(t, shouldIgnoreAPIKeyUpdate("abcd****wxyz"))
}
