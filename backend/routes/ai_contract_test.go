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
