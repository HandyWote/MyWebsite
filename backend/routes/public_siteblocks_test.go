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
