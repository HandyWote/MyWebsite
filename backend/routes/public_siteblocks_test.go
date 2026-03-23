package routes

import (
	"testing"

	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
)

func TestBuildPublicSiteBlockPayload_ParseAndFlatten(t *testing.T) {
	block := models.SiteBlock{
		ID:      1,
		Name:    "home",
		Content: `{"title":"HandyWote","subtitle":"hello"}`,
	}

	payload := buildPublicSiteBlockPayload(block)

	assert.Equal(t, uint(1), payload["id"])
	assert.Equal(t, "home", payload["name"])
	content, ok := payload["content"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "HandyWote", content["title"])
	assert.Equal(t, "HandyWote", payload["title"])
	assert.Equal(t, "hello", payload["subtitle"])
}

func TestBuildPublicSiteBlockPayload_ReservedKeysNotOverridden(t *testing.T) {
	block := models.SiteBlock{
		ID:      9,
		Name:    "articles_page",
		Content: `{"id":123,"name":"bad","content":"bad","title":"文章"}`,
	}

	payload := buildPublicSiteBlockPayload(block)

	assert.Equal(t, uint(9), payload["id"])
	assert.Equal(t, "articles_page", payload["name"])
	assert.Equal(t, "文章", payload["title"])
	content, ok := payload["content"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, float64(123), content["id"])
}
