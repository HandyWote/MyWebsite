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
		utils.ErrorNotFound(c, "AI setting not found")
		return
	}

	utils.Success(c, setting)
}

// UpdateAISetting 更新 AI 配置
func UpdateAISetting(c *gin.Context) {
	var input models.AISetting
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
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
	res := map[string]interface{}{
		"category":          "",
		"tags":              []string{},
		"suggested_summary": strings.TrimSpace(raw),
	}

	if strings.TrimSpace(raw) == "" {
		return res
	}

	var parsed struct {
		Category         string   `json:"category"`
		Tags             []string `json:"tags"`
		SuggestedSummary string   `json:"suggested_summary"`
		Summary          string   `json:"summary"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return res
	}

	res["category"] = strings.TrimSpace(parsed.Category)
	res["tags"] = parsed.Tags
	switch {
	case strings.TrimSpace(parsed.SuggestedSummary) != "":
		res["suggested_summary"] = strings.TrimSpace(parsed.SuggestedSummary)
	case strings.TrimSpace(parsed.Summary) != "":
		res["suggested_summary"] = strings.TrimSpace(parsed.Summary)
	default:
		res["suggested_summary"] = ""
	}
	return res
}
