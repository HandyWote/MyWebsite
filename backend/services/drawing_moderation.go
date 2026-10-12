package services

// 公共画布投稿审核链:ASCII 栅格输入 → 图形判定通道 + OCR 转录通道 →
// 四态裁决(clean|violation|ocr|pending)。LLM 走 ai.go 的纯文本
// callChatCompletion,这正是 ASCII 栅格方案的原因(Message.Content 是 string)。
//
// 宁可错杀:任何通道不确定(LLM 未配置、网络失败、响应不可解析)一律
// pending 人工审,绝不放行。

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/handywote/website/config"
)

// DrawingStroke / DrawingPoint 与路由层 JSON 结构一致(客户端契约)。
// 服务层独立声明,避免 routes → services 的反向依赖。
type DrawingStroke struct {
	ID     string         `json:"id"`
	Color  string         `json:"color"`
	Width  float64        `json:"width"`
	Points []DrawingPoint `json:"points"`
}

type DrawingPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	T int64   `json:"t"`
}

// DrawingVerdict 审核裁决。
type DrawingVerdict int

const (
	DrawingClean     DrawingVerdict = iota // 两通道全清,直接发布
	DrawingViolation                       // 图形通道判定不当内容
	DrawingOCRHit                          // OCR 转录命中敏感词表
	DrawingPending                         // 任一通道不确定,转人工
)

// drawingModerationService 是审核链的可注入实现;routes 层持包级变量便于
// 测试整体替换(模式同 github_oauth.go 的 githubUserUpserter)。
type drawingModerationService struct {
	ai      *AIService
	client  *http.Client
	timeout time.Duration
	// resolve 拆出配置解析供测试注入(默认走 ai.ResolveConfig:db
	// ai_settings 优先,回退 env);打桩后 LLM endpoint 可指向 httptest。
	resolve func(ctx context.Context, cfg *config.Config) (ResolvedAIConfig, error)
}

func newDrawingModerationService() *drawingModerationService {
	ai := NewAIService(nil, nil, nil)
	return &drawingModerationService{
		ai:      ai,
		timeout: 30 * time.Second,
		resolve: func(ctx context.Context, cfg *config.Config) (ResolvedAIConfig, error) {
			resolved, _, err := ai.ResolveConfig(ctx, cfg)
			return resolved, err
		},
	}
}

// ModerateDrawing 编排两通道:先图形判定,violation 短路直接拒,不再调
// OCR;两通道都 clean 才 published。入参已是校验后的笔画。
func (s *drawingModerationService) ModerateDrawing(ctx context.Context, strokes []DrawingStroke) (DrawingVerdict, string, error) {
	grid := RasterizeStrokesToASCII(strokes)

	// 通道一:图形判定。
	resolved, err := s.resolve(ctx, config.LoadConfig())
	if err != nil {
		// LLM 未配置:图形通道不可用,按宁可错杀原则 pending 人工审。
		return DrawingPending, "graphic-moderation-unconfigured", nil
	}

	graphicRaw, err := callChatCompletion(ctx, s.client, resolved, []Message{
		{Role: "system", Content: drawingGraphicModerationPrompt()},
		{Role: "user", Content: grid},
	}, s.timeout)
	if err != nil {
		// 调用失败(网络/超时/上游错误)按不确定处理,不判违规也不放行。
		return DrawingPending, "graphic-call-failed", nil
	}
	graphicVerdict, ok := parseDrawingVerdict(graphicRaw)
	if !ok {
		// 响应不可解析按不确定处理。
		return DrawingPending, "graphic-response-unparseable", nil
	}
	if graphicVerdict == "violation" {
		return DrawingViolation, "graphic", nil
	}

	// 通道二:OCR 转录 + 词表匹配。
	ocrRaw, err := callChatCompletion(ctx, s.client, resolved, []Message{
		{Role: "system", Content: drawingOCRPrompt()},
		{Role: "user", Content: grid},
	}, s.timeout)
	if err != nil {
		return DrawingPending, "ocr-call-failed", nil
	}
	transcript, ok := parseDrawingOCRText(ocrRaw)
	if !ok {
		return DrawingPending, "ocr-response-unparseable", nil
	}
	if hit := MatchDrawingWordlist(transcript); hit != "" {
		return DrawingOCRHit, "ocr", nil
	}

	// graphicVerdict == "clean"(parseDrawingVerdict 只会回 clean|violation|uncertain,
	// 非 violation 分支上面已拦)且 OCR 无词表命中。
	if graphicVerdict == "uncertain" {
		return DrawingPending, "graphic-uncertain", nil
	}
	return DrawingClean, "", nil
}

// drawingGraphicModerationPrompt 图形通道提示词。象征性图形、字母变体、
// 拼音缩写等规避手段一律按违规处理,提高误杀率换取低漏杀率。
func drawingGraphicModerationPrompt() string {
	return "你是画布内容审核员。下面是一个用户手绘画布转成的 ASCII 字符栅格(宽96×高72,每行等宽)。请判断画面是否包含不当内容:色情/暴力/仇恨/毒品/政治敏感符号。象征性图形、字母变体、拼音首字母缩写一律按违规处理。只回 JSON,不要任何解释:{\"verdict\":\"clean|violation|uncertain\"}"
}

// drawingOCRPrompt OCR 通道提示词:逐字符转录,无文本回空串。
func drawingOCRPrompt() string {
	return "你是画布内容审核员。下面是一个用户手绘画布转成的 ASCII 字符栅格(宽96×高72,每行等宽)。请逐字符转录栅格图中的英文文本(忽略无关图形线条);无文本时返回空字符串。只回 JSON,不要任何解释:{\"text\":\"...\"}"
}

// stripDrawingCodeFence 剥掉 LLM 爱包的 ```json 围栏。
func stripDrawingCodeFence(raw string) string {
	trimmed := strings.TrimSpace(raw)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	return strings.TrimSpace(trimmed)
}

// drawingJSONField 从响应 JSON 中取出指定字段(基于 map 解析,才能区分
// "字段缺失"与"字段为空值":缺失必须 uncertain,空值是合法应答)。
func drawingJSONField(raw, field string) (string, bool) {
	var payload map[string]json.RawMessage
	if err := json.Unmarshal([]byte(stripDrawingCodeFence(raw)), &payload); err != nil {
		return "", false
	}
	value, ok := payload[field]
	if !ok {
		return "", false
	}
	var text string
	if err := json.Unmarshal(value, &text); err != nil {
		return "", false
	}
	return text, true
}

// parseDrawingVerdict 解析图形通道响应。缺字段/非 JSON/非法值一律 ok=false,
// 由调用方按"宁可错杀"转 pending。
func parseDrawingVerdict(raw string) (string, bool) {
	verdict, ok := drawingJSONField(raw, "verdict")
	if !ok {
		return "", false
	}
	verdict = strings.ToLower(strings.TrimSpace(verdict))
	switch verdict {
	case "clean", "violation", "uncertain":
		return verdict, true
	}
	return "", false
}

// parseDrawingOCRText 解析 OCR 通道响应,容错同上;缺 text 字段视为不可解析
// (无文本时 LLM 应回空字符串而不是省略字段)。
func parseDrawingOCRText(raw string) (string, bool) {
	return drawingJSONField(raw, "text")
}

// routes 层包级变量:测试整体替换以打桩审核链,避免真实 LLM 调用。
var drawingModeration func(ctx context.Context, strokes []DrawingStroke) (DrawingVerdict, string, error) = func(ctx context.Context, strokes []DrawingStroke) (DrawingVerdict, string, error) {
	return newDrawingModerationService().ModerateDrawing(ctx, strokes)
}

// ModerateDrawingForRoutes 是 routes 层调用的稳定入口,指向可替换的
// drawingModeration。
func ModerateDrawingForRoutes(ctx context.Context, strokes []DrawingStroke) (DrawingVerdict, string, error) {
	return drawingModeration(ctx, strokes)
}
