package services

import (
	"bytes"
	"encoding/json"
	"fmt"
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

// AnalyzeWithAI 使用 AI 分析文章
func AnalyzeWithAI(articleID uint, cfg *config.Config) (string, error) {
	var article models.Article
	if err := database.GetDB().First(&article, articleID).Error; err != nil {
		return "", err
	}

	prompt := fmt.Sprintf("请分析以下文章，提取关键信息和标签：\n\n标题：%s\n内容：%s", article.Title, article.Content)

	reqBody := AIRequest{
		Model: cfg.OpenAIModel,
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", cfg.OpenAIAPIURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.OpenAIAPIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var aiResp AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		return "", err
	}

	if len(aiResp.Choices) > 0 {
		return aiResp.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("no response from AI")
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
