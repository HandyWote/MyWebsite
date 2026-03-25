package routes

import (
	"encoding/json"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/models"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

// AnalyzeArticle AI 分析文章
func AnalyzeArticle(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}

	cfg := config.LoadConfig()

	result, err := services.AnalyzeWithAI(id, cfg)
	if err != nil {
		utils.ErrorInternal(c, "Failed to analyze article: "+err.Error())
		return
	}

	utils.Success(c, normalizeAIAnalyzeResult(result))
}

// AnalyzeArticleByContent 按前端提交内容进行 AI 分析（兼容 /api/admin/articles/ai-analyze）
func AnalyzeArticleByContent(c *gin.Context) {
	var input struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content" binding:"required"`
		Summary string `json:"summary"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	cfg := config.LoadConfig()
	result, err := services.AnalyzeTextWithAI(input.Title, input.Content, input.Summary, cfg)
	if err != nil {
		utils.ErrorInternal(c, "Failed to analyze article: "+err.Error())
		return
	}

	utils.Success(c, normalizeAIAnalyzeResult(result))
}

// GetAISetting 获取 AI 配置
func GetAISetting(c *gin.Context) {
	setting, err := services.GetAISetting()
	if err != nil {
		// 没有配置记录时，从环境变量读取默认值
		cfg := config.LoadConfig()
		utils.Success(c, gin.H{
			"prompt":         "", // 提示词使用代码内置默认值
			"model":          cfg.OpenAIModel,
			"base_url":       cfg.OpenAIAPIURL,
			"api_key":        "",
			"api_key_masked": maskAPIKey(cfg.OpenAIAPIKey),
		})
		return
	}

	utils.Success(c, gin.H{
		"id":             setting.ID,
		"prompt":         setting.Prompt,
		"model":          setting.Model,
		"base_url":       setting.BaseURL,
		"api_key":        "",
		"api_key_masked": maskAPIKey(setting.APIKey),
		"created_at":     setting.CreatedAt,
		"updated_at":     setting.UpdatedAt,
	})
}

// UpdateAISetting 更新 AI 配置
func UpdateAISetting(c *gin.Context) {
	var input models.AISetting
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	if shouldIgnoreAPIKeyUpdate(input.APIKey) {
		input.APIKey = ""
	}

	setting, err := services.UpdateAISetting(input)
	if err != nil {
		utils.ErrorInternal(c, "Failed to update AI setting")
		return
	}

	utils.Success(c, setting)
}

// TestAISetting 测试 AI 配置
func TestAISetting(c *gin.Context) {
	var input struct {
		APIKey string `json:"api_key"`
		Model  string `json:"model"`
		URL    string `json:"base_url"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}

	// 验证配置是否有效
	if input.APIKey == "" {
		utils.ErrorBadRequest(c, "API key is required")
		return
	}

	cfg := config.LoadConfig()

	// 临时使用输入的配置进行测试
	testCfg := *cfg
	testCfg.OpenAIAPIKey = input.APIKey
	testCfg.OpenAIModel = input.Model
	if input.URL != "" {
		testCfg.OpenAIAPIURL = input.URL
	}

	// 简单测试：检查 API key 是否可以连接
	err := services.TestAIConnection(testCfg)
	if err != nil {
		utils.ErrorInternal(c, "AI connection failed: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "AI connection test successful"})
}

func normalizeAIAnalyzeResult(raw string) map[string]interface{} {
	cleanRaw := strings.TrimSpace(raw)
	res := map[string]interface{}{
		"category":          "",
		"tags":              []string{},
		"suggested_summary": cleanRaw,
	}

	if cleanRaw == "" {
		return res
	}

	jsonText := extractJSONObject(cleanRaw)
	if jsonText == "" {
		return res
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(jsonText), &parsed); err != nil {
		return res
	}

	res["category"] = strings.TrimSpace(getStringValue(parsed, "category"))
	res["tags"] = normalizeTags(parsed["tags"])

	summary := strings.TrimSpace(getStringValue(parsed, "suggested_summary"))
	if summary == "" {
		summary = strings.TrimSpace(getStringValue(parsed, "summary"))
	}
	res["suggested_summary"] = summary

	return res
}

func extractJSONObject(text string) string {
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start == -1 || end == -1 || end < start {
		return ""
	}
	return strings.TrimSpace(text[start : end+1])
}

func getStringValue(input map[string]interface{}, key string) string {
	value, ok := input[key]
	if !ok || value == nil {
		return ""
	}
	if s, ok := value.(string); ok {
		return s
	}
	return ""
}

func normalizeTags(tags interface{}) []string {
	out := make([]string, 0)
	switch v := tags.(type) {
	case []interface{}:
		for _, item := range v {
			if s, ok := item.(string); ok {
				trimmed := strings.TrimSpace(s)
				if trimmed != "" {
					out = append(out, trimmed)
				}
			}
		}
	case []string:
		for _, item := range v {
			trimmed := strings.TrimSpace(item)
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
	case string:
		parts := strings.Split(v, ",")
		for _, item := range parts {
			trimmed := strings.TrimSpace(item)
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
	}
	return out
}

func maskAPIKey(raw string) string {
	key := strings.TrimSpace(raw)
	if key == "" {
		return ""
	}
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "****" + key[len(key)-4:]
}

func shouldIgnoreAPIKeyUpdate(key string) bool {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" {
		return false
	}
	return strings.Contains(trimmed, "****")
}
