package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/handywote/website/config"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
)

type AIRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIResponse struct {
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Message Message `json:"message"`
}

// 默认 AI 分析提示词
const defaultAIPrompt = `你是一位专业的内容分析师。请分析给定的文章内容，并返回符合以下 JSON 格式的分析结果：

{
  "category": "文章分类（选择最贴切的一个：技术、生活、随笔、教程、其他）",
  "tags": ["标签1", "标签2", "标签3"],
  "suggested_summary": "50-120字的文章摘要，简明扼要地概括文章核心内容"
}

分析要求：
1. 分类应该准确反映文章主题
2. 标签应选择3-5个最具代表性的关键词
3. 摘要应该独立成段，让读者快速了解文章要点
4. 仅返回 JSON，不要添加任何其他说明文字`

// getAIConfig 获取 AI 配置，优先使用数据库配置，否则使用环境变量
func getAIConfig(cfg *config.Config) (apiKey, model, apiURL string) {
	var setting models.AISetting
	if err := database.GetDB().First(&setting).Error; err == nil {
		// 数据库配置存在，优先使用
		if setting.APIKey != "" {
			apiKey = setting.APIKey
		} else {
			apiKey = cfg.OpenAIAPIKey
		}
		if setting.Model != "" {
			model = setting.Model
		} else {
			model = cfg.OpenAIModel
		}
		if setting.BaseURL != "" {
			apiURL = setting.BaseURL
		} else {
			apiURL = cfg.OpenAIAPIURL
		}
	} else {
		// 数据库配置不存在，使用环境变量
		apiKey = cfg.OpenAIAPIKey
		model = cfg.OpenAIModel
		apiURL = cfg.OpenAIAPIURL
	}
	return apiKey, model, apiURL
}

// getAIPrompt 获取 AI 提示词，优先使用数据库配置，否则使用默认值
func getAIPrompt() string {
	var setting models.AISetting
	if err := database.GetDB().First(&setting).Error; err == nil && setting.Prompt != "" {
		return setting.Prompt
	}
	return defaultAIPrompt
}

// AnalyzeWithAI 使用 AI 分析文章
func AnalyzeWithAI(articleID uint, cfg *config.Config) (string, error) {
	var article models.Article
	if err := database.GetDB().First(&article, articleID).Error; err != nil {
		return "", err
	}

	return AnalyzeTextWithAI(article.Title, article.Content, article.Summary, cfg)
}

// AnalyzeTextWithAI 使用 AI 直接分析传入文本
func AnalyzeTextWithAI(title, content, summary string, cfg *config.Config) (string, error) {
	systemPrompt := getAIPrompt()

	userContent := fmt.Sprintf("文章标题：%s\n\n文章内容：\n%s", title, content)
	if summary != "" {
		userContent = fmt.Sprintf("文章标题：%s\n\n已有摘要：%s\n\n文章内容：\n%s", title, summary, content)
	}

	// 限制内容长度，避免超过 token 限制
	maxContentLen := 8000
	if len(userContent) > maxContentLen {
		userContent = userContent[:maxContentLen] + "\n...(内容已截断)"
	}

	// 获取配置：优先数据库，其次环境变量
	apiKey, model, apiURL := getAIConfig(cfg)

	// 检查配置
	if apiKey == "" || apiKey == "sk-xxxx" {
		return "", fmt.Errorf("AI API Key 未配置，请在 AI 设置中配置有效的 API Key")
	}

	reqBody := AIRequest{
		Model: model,
		Messages: []Message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userContent},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("构建请求失败: %w", err)
	}

	req, err := http.NewRequest("POST", apiURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * 1000000000} // 30秒超时
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("AI API 连接失败: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应体用于错误诊断
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != 200 {
		// 尝试解析错误信息
		var errResp struct {
			Error struct {
				Message string `json:"message"`
				Type    string `json:"type"`
			} `json:"error"`
		}
		if json.Unmarshal(bodyBytes, &errResp) == nil && errResp.Error.Message != "" {
			return "", fmt.Errorf("AI API 错误 (%d): %s", resp.StatusCode, errResp.Error.Message)
		}
		return "", fmt.Errorf("AI API 返回状态码 %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var aiResp AIResponse
	if err := json.Unmarshal(bodyBytes, &aiResp); err != nil {
		return "", fmt.Errorf("解析 AI 响应失败: %w", err)
	}

	if len(aiResp.Choices) > 0 {
		return aiResp.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("AI 未返回有效响应")
}

// GetAISetting 获取 AI 配置
func GetAISetting() (models.AISetting, error) {
	var setting models.AISetting
	result := database.GetDB().First(&setting)
	return setting, result.Error
}

// UpdateAISetting 更新 AI 配置
func UpdateAISetting(input models.AISetting) (models.AISetting, error) {
	var setting models.AISetting
	result := database.GetDB().First(&setting)

	if result.Error != nil {
		// 不存在则创建
		if err := database.GetDB().Create(&input).Error; err != nil {
			return setting, err
		}
		return input, nil
	}

	// 存在则更新
	if err := database.GetDB().Model(&setting).Updates(input).Error; err != nil {
		return setting, err
	}
	return setting, nil
}

// TestAIConnection 测试 AI 连接
func TestAIConnection(cfg config.Config) error {
	// 构建测试请求
	reqBody := AIRequest{
		Model: cfg.OpenAIModel,
		Messages: []Message{
			{Role: "user", Content: "Hello"},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", cfg.OpenAIAPIURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.OpenAIAPIKey)

	client := &http.Client{Timeout: 10 * 1000000000} // 10秒超时
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("API returned status code: %d", resp.StatusCode)
	}

	return nil
}
