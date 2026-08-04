package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/handywote/website/config"
	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"gorm.io/gorm"
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

type ResolvedAIConfig struct {
	APIKey  string
	Model   string
	BaseURL string
}

type AISettingView struct {
	ID           uint      `json:"id,omitempty"`
	Prompt       string    `json:"prompt"`
	Model        string    `json:"model"`
	BaseURL      string    `json:"base_url"`
	APIKey       string    `json:"api_key"`
	APIKeyMasked string    `json:"api_key_masked"`
	CreatedAt    time.Time `json:"created_at,omitempty"`
	UpdatedAt    time.Time `json:"updated_at,omitempty"`
}

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

type AIService struct {
	settings *repositories.AISettingRepository
	articles *repositories.ArticleRepository
	client   *http.Client
}

func NewAIService(settings *repositories.AISettingRepository, articles *repositories.ArticleRepository, client *http.Client) *AIService {
	if settings == nil {
		settings = repositories.NewAISettingRepository()
	}
	if articles == nil {
		articles = repositories.NewArticleRepository()
	}
	if client == nil {
		client = &http.Client{}
	}
	return &AIService{settings: settings, articles: articles, client: client}
}

func (s *AIService) ResolveConfig(ctx context.Context, cfg *config.Config) (ResolvedAIConfig, models.AISetting, error) {
	setting, dbErr := s.settings.Get(ctx)
	if dbErr == nil && validAIConfig(setting.APIKey, setting.Model, setting.BaseURL) {
		return ResolvedAIConfig{APIKey: strings.TrimSpace(setting.APIKey), Model: strings.TrimSpace(setting.Model), BaseURL: strings.TrimSpace(setting.BaseURL)}, setting, nil
	}
	if dbErr != nil && !errors.Is(dbErr, gorm.ErrRecordNotFound) {
		return ResolvedAIConfig{}, models.AISetting{}, dbErr
	}
	if cfg != nil && validAIConfig(cfg.OpenAIAPIKey, cfg.OpenAIModel, cfg.OpenAIAPIURL) {
		return ResolvedAIConfig{APIKey: strings.TrimSpace(cfg.OpenAIAPIKey), Model: strings.TrimSpace(cfg.OpenAIModel), BaseURL: strings.TrimSpace(cfg.OpenAIAPIURL)}, setting, nil
	}
	return ResolvedAIConfig{}, setting, errors.New("AI is not configured")
}

func validAIConfig(apiKey, model, baseURL string) bool {
	key := strings.TrimSpace(apiKey)
	return key != "" && key != "sk-xxxx" && strings.TrimSpace(model) != "" && strings.TrimSpace(baseURL) != ""
}

func (s *AIService) AnalyzeArticle(ctx context.Context, articleID uint, cfg *config.Config) (string, error) {
	article, err := s.articles.FindByID(ctx, articleID)
	if err != nil {
		return "", err
	}
	return s.AnalyzeText(ctx, article.Title, article.Content, article.Summary, cfg)
}

func (s *AIService) AnalyzeText(ctx context.Context, title, content, summary string, cfg *config.Config) (string, error) {
	resolved, setting, err := s.ResolveConfig(ctx, cfg)
	if err != nil {
		return "", err
	}
	prompt := strings.TrimSpace(setting.Prompt)
	if prompt == "" {
		prompt = defaultAIPrompt
	}
	userContent := fmt.Sprintf("文章标题：%s\n\n文章内容：\n%s", title, content)
	if summary != "" {
		userContent = fmt.Sprintf("文章标题：%s\n\n已有摘要：%s\n\n文章内容：\n%s", title, summary, content)
	}
	if len(userContent) > 8000 {
		userContent = userContent[:8000] + "\n...(内容已截断)"
	}
	return callChatCompletion(ctx, s.client, resolved, []Message{{Role: "system", Content: prompt}, {Role: "user", Content: userContent}}, 30*time.Second)
}

func callChatCompletion(ctx context.Context, client *http.Client, cfg ResolvedAIConfig, messages []Message, timeout time.Duration) (string, error) {
	if !validAIConfig(cfg.APIKey, cfg.Model, cfg.BaseURL) {
		return "", errors.New("AI is not configured")
	}
	if client == nil {
		client = &http.Client{}
	}
	requestBody, err := json.Marshal(AIRequest{Model: cfg.Model, Messages: messages})
	if err != nil {
		return "", fmt.Errorf("build AI request: %w", err)
	}
	requestCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	endpoint := strings.TrimRight(cfg.BaseURL, "/") + "/chat/completions"
	req, err := http.NewRequestWithContext(requestCtx, http.MethodPost, endpoint, bytes.NewReader(requestBody))
	if err != nil {
		return "", fmt.Errorf("create AI request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("AI request failed: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("read AI response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var upstream struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		message := http.StatusText(resp.StatusCode)
		if json.Unmarshal(body, &upstream) == nil && strings.TrimSpace(upstream.Error.Message) != "" {
			message = upstream.Error.Message
		}
		return "", fmt.Errorf("AI upstream returned %d: %s", resp.StatusCode, redactSecret(message, cfg.APIKey))
	}
	var response AIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("parse AI response: %w", err)
	}
	if len(response.Choices) == 0 || strings.TrimSpace(response.Choices[0].Message.Content) == "" {
		return "", errors.New("AI returned no choices")
	}
	return response.Choices[0].Message.Content, nil
}

func (s *AIService) GetSetting(ctx context.Context) (models.AISetting, error) {
	return s.settings.Get(ctx)
}

func (s *AIService) SettingView(ctx context.Context, cfg *config.Config) (AISettingView, error) {
	setting, err := s.settings.Get(ctx)
	if err == nil {
		return AISettingView{
			ID: setting.ID, Prompt: setting.Prompt, Model: setting.Model, BaseURL: setting.BaseURL,
			APIKeyMasked: MaskAPIKey(setting.APIKey), CreatedAt: setting.CreatedAt, UpdatedAt: setting.UpdatedAt,
		}, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return AISettingView{}, err
	}
	return AISettingView{Model: cfg.OpenAIModel, BaseURL: cfg.OpenAIAPIURL, APIKeyMasked: MaskAPIKey(cfg.OpenAIAPIKey)}, nil
}

func MaskAPIKey(raw string) string {
	key := strings.TrimSpace(raw)
	if key == "" {
		return ""
	}
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "****" + key[len(key)-4:]
}

func (s *AIService) UpdateSetting(ctx context.Context, input models.AISetting) (models.AISetting, error) {
	return s.settings.Save(ctx, input)
}

func (s *AIService) TestConnection(ctx context.Context, resolved ResolvedAIConfig) error {
	_, err := callChatCompletion(ctx, s.client, resolved, []Message{{Role: "user", Content: "Hello"}}, 10*time.Second)
	return err
}

func defaultAIService() *AIService { return NewAIService(nil, nil, nil) }

func AnalyzeWithAI(articleID uint, cfg *config.Config) (string, error) {
	result, err := defaultAIService().AnalyzeArticle(context.Background(), articleID, cfg)
	if err != nil {
		return "", fmt.Errorf("analyze article %d with AI: %w", articleID, err)
	}
	return result, nil
}

func AnalyzeTextWithAI(title, content, summary string, cfg *config.Config) (string, error) {
	result, err := defaultAIService().AnalyzeText(context.Background(), title, content, summary, cfg)
	if err != nil {
		return "", fmt.Errorf("analyze supplied text with AI: %w", err)
	}
	return result, nil
}

func GetAISetting() (models.AISetting, error) {
	setting, err := defaultAIService().GetSetting(context.Background())
	if err != nil {
		return models.AISetting{}, fmt.Errorf("get AI setting: %w", err)
	}
	return setting, nil
}

func UpdateAISetting(input models.AISetting) (models.AISetting, error) {
	setting, err := defaultAIService().UpdateSetting(context.Background(), input)
	if err != nil {
		return models.AISetting{}, fmt.Errorf("update AI setting: %w", err)
	}
	return setting, nil
}

func TestAIConnection(cfg config.Config) error {
	resolved := ResolvedAIConfig{APIKey: cfg.OpenAIAPIKey, Model: cfg.OpenAIModel, BaseURL: cfg.OpenAIAPIURL}
	if err := defaultAIService().TestConnection(context.Background(), resolved); err != nil {
		return fmt.Errorf("test AI connection: %w", err)
	}
	return nil
}
