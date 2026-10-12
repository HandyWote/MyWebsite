package services

// 画布审核链测试:栅格化纯函数(表驱动)、词表命中(表驱动)、LLM 响应解析
// 容错(垃圾/超时)、编排短路(pending 宁可错杀)。全部行为级,能死。

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/handywote/website/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func gridDims(t *testing.T, grid string) (rows, cols int) {
	t.Helper()
	lines := strings.Split(grid, "\n")
	require.NotEmpty(t, lines)
	for _, line := range lines {
		assert.Len(t, line, gridWidth, "每行必须等宽")
	}
	return len(lines), len(lines[0])
}

func TestRasterizeStrokesToASCIITableDriven(t *testing.T) {
	dot := rune(densityRamp[len(densityRamp)-1])
	cases := []struct {
		name    string
		strokes []DrawingStroke
		check   func(t *testing.T, grid string)
	}{
		{
			name:    "空输入得到全空白栅格",
			strokes: []DrawingStroke{},
			check: func(t *testing.T, grid string) {
				assert.NotContains(t, grid, string(dot))
			},
		},
		{
			name: "水平线落在对应行",
			strokes: []DrawingStroke{{ID: "s", Color: "#000", Width: 1, Points: []DrawingPoint{
				{X: 0, Y: 0.5}, {X: 1, Y: 0.5},
			}}},
			check: func(t *testing.T, grid string) {
				lines := strings.Split(grid, "\n")
				require.Len(t, lines, gridHeight)
				mid := lines[gridHeight/2]
				assert.Equal(t, strings.Repeat("#", gridWidth), mid, "水平线应贯穿整行")
				// 相邻行保持空白(单像素高)。
				assert.Equal(t, strings.Repeat(" ", gridWidth), lines[gridHeight/2-1])
			},
		},
		{
			name: "单点笔画落实心点",
			strokes: []DrawingStroke{{ID: "dot", Color: "#000", Width: 1, Points: []DrawingPoint{
				{X: 0.5, Y: 0.5},
			}}},
			check: func(t *testing.T, grid string) {
				lines := strings.Split(grid, "\n")
				row := lines[gridHeight/2]
				assert.Equal(t, dot, rune(row[gridWidth/2]), "画布中心应是实心点")
				assert.Equal(t, 1, strings.Count(row, string(dot)), "只有一个实心点")
			},
		},
		{
			name: "越界坐标被截断不 panic",
			strokes: []DrawingStroke{{ID: "edge", Color: "#000", Width: 1, Points: []DrawingPoint{
				{X: -5, Y: -5}, {X: 9, Y: 9},
			}}},
			check: func(t *testing.T, grid string) {
				rows, cols := gridDims(t, grid)
				assert.Equal(t, gridHeight, rows)
				assert.Equal(t, gridWidth, cols)
				// 左上角与右下角都有落笔。
				lines := strings.Split(grid, "\n")
				assert.NotEqual(t, ' ', rune(lines[0][0]))
				assert.NotEqual(t, ' ', rune(lines[gridHeight-1][gridWidth-1]))
			},
		},
		{
			name:    "无点笔画被忽略",
			strokes: []DrawingStroke{{ID: "empty", Color: "#000", Width: 1, Points: []DrawingPoint{}}},
			check: func(t *testing.T, grid string) {
				assert.NotContains(t, grid, string(dot))
			},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			grid := RasterizeStrokesToASCII(tc.strokes)
			rows, cols := gridDims(t, grid)
			assert.Equal(t, gridHeight, rows, "栅格必须 %d 行", gridHeight)
			assert.Equal(t, gridWidth, cols, "栅格必须 %d 列", gridWidth)
			tc.check(t, grid)
		})
	}
}

func TestDrawingWordlistTableDriven(t *testing.T) {
	cases := []struct {
		name       string
		transcript string
		wantHit    string
	}{
		{name: "精确词命中", transcript: "hello fuck world", wantHit: "fuck"},
		{name: "大小写归一", transcript: "NaZi", wantHit: "nazi"},
		{name: "标点分隔仍命中", transcript: "this is, porn!", wantHit: "porn"},
		{name: "子串不误杀", transcript: "assess classic", wantHit: ""},
		{name: "正常英文不命中", transcript: "hello world", wantHit: ""},
		{name: "空转录", transcript: "", wantHit: ""},
		{name: "纯符号", transcript: "!!! ...", wantHit: ""},
		{name: "数字夹带词", transcript: "user123 sex99", wantHit: ""},
		{name: "纯数字符号不命中", transcript: "123 456", wantHit: ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := MatchDrawingWordlist(tc.transcript)
			assert.Equal(t, tc.wantHit, got)
		})
	}
}

func TestParseDrawingResponsesToleratesGarbage(t *testing.T) {
	// 图形通道:合法/带围栏/垃圾/缺字段/非法值。
	verdict, ok := parseDrawingVerdict(`{"verdict":"violation"}`)
	require.True(t, ok)
	assert.Equal(t, "violation", verdict)

	verdict, ok = parseDrawingVerdict("```json\n{\"verdict\":\"clean\"}\n```")
	require.True(t, ok)
	assert.Equal(t, "clean", verdict)

	_, ok = parseDrawingVerdict("I think it's fine, not JSON")
	assert.False(t, ok, "非 JSON 必须 uncertain 化(ok=false)")
	_, ok = parseDrawingVerdict(`{"verdict":"maybe"}`)
	assert.False(t, ok, "非法 verdict 值必须 uncertain 化")
	_, ok = parseDrawingVerdict(`{"foo":1}`)
	assert.False(t, ok, "缺 verdict 字段必须 uncertain 化")

	// OCR 通道:空字符串转录合法(无文本),缺 text 字段不可解析。
	text, ok := parseDrawingOCRText(`{"text":""}`)
	require.True(t, ok)
	assert.Empty(t, text)
	text, ok = parseDrawingOCRText(`{"text":"fuck"}`)
	require.True(t, ok)
	assert.Equal(t, "fuck", text)
	_, ok = parseDrawingOCRText("sorry I cannot transcribe")
	assert.False(t, ok)
	_, ok = parseDrawingOCRText(`{"transcript":"fuck"}`)
	assert.False(t, ok, "缺 text 字段视为不可解析")
}

// drawingStubLLM 起一个 httptest server 按 system 提示词区分两通道应答,
// 并返回服务实例(resolve 打桩指向 server,隔离真实配置解析)。
func drawingStubLLM(t *testing.T, graphic, ocr func() string) (*drawingModerationService, *httptest.Server) {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		prompt := string(body)
		resp := graphic()
		if strings.Contains(prompt, "逐字符转录") {
			resp = ocr()
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":` + jsonStringForTest(resp) + `}}]}`))
	}))
	t.Cleanup(server.Close)

	s := newDrawingModerationService()
	s.client = server.Client()
	s.timeout = 2 * time.Second
	s.resolve = func(_ context.Context, _ *config.Config) (ResolvedAIConfig, error) {
		return ResolvedAIConfig{APIKey: "stub-key", Model: "stub-model", BaseURL: server.URL}, nil
	}
	return s, server
}

// jsonStringForTest 把字符串编码成 JSON 字符串字面量。
func jsonStringForTest(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}

func testStrokes() []DrawingStroke {
	return []DrawingStroke{{ID: "s", Color: "#000", Width: 1, Points: []DrawingPoint{{X: 0, Y: 0}, {X: 1, Y: 0}}}}
}

func TestModerateDrawingWithoutLLMConfigFallsToPending(t *testing.T) {
	// 未配 LLM:resolve 返回错误(与 ai.ResolveConfig 未配置时一致)→
	// 两通道不可用,宁可错杀 → pending。
	s := newDrawingModerationService()
	s.resolve = func(_ context.Context, _ *config.Config) (ResolvedAIConfig, error) {
		return ResolvedAIConfig{}, errors.New("AI is not configured")
	}
	verdict, reason, err := s.ModerateDrawing(context.Background(), testStrokes())
	require.NoError(t, err)
	assert.Equal(t, DrawingPending, verdict)
	assert.NotEmpty(t, reason, "pending 必须带可追溯原因")
}

func TestModerateDrawingGraphicShortCircuitsBeforeOCR(t *testing.T) {
	// 图形 violation 短路:OCR 通道不被调用(若被调到,OCR 打桩会让测试死)。
	ocrCalled := false
	s, _ := drawingStubLLM(t,
		func() string { return `{"verdict":"violation"}` },
		func() string { ocrCalled = true; return `{"text":"whatever"}` },
	)
	verdict, reason, err := s.ModerateDrawing(context.Background(), testStrokes())
	require.NoError(t, err)
	assert.Equal(t, DrawingViolation, verdict)
	assert.Equal(t, "graphic", reason)
	assert.False(t, ocrCalled, "图形违规必须短路,不再调 OCR")
}

func TestModerateDrawingCleanWhenBothChannelsClean(t *testing.T) {
	s, _ := drawingStubLLM(t,
		func() string { return `{"verdict":"clean"}` },
		func() string { return `{"text":"hello"}` },
	)
	verdict, reason, err := s.ModerateDrawing(context.Background(), testStrokes())
	require.NoError(t, err)
	assert.Equal(t, DrawingClean, verdict)
	assert.Empty(t, reason, "clean 不带原因(直接发布)")
}

func TestModerateDrawingGarbageLLMResponseFallsToPending(t *testing.T) {
	s, _ := drawingStubLLM(t,
		func() string { return "garbage not json" },
		func() string { return "garbage not json" },
	)
	verdict, reason, err := s.ModerateDrawing(context.Background(), testStrokes())
	require.NoError(t, err)
	assert.Equal(t, DrawingPending, verdict)
	assert.NotEmpty(t, reason)
}

func TestModerateDrawingGraphicUncertainFallsToPending(t *testing.T) {
	// 图形通道 uncertain:即使 OCR clean 也不放行(宁可错杀)。
	s, _ := drawingStubLLM(t,
		func() string { return `{"verdict":"uncertain"}` },
		func() string { return `{"text":""}` },
	)
	verdict, reason, err := s.ModerateDrawing(context.Background(), testStrokes())
	require.NoError(t, err)
	assert.Equal(t, DrawingPending, verdict)
	assert.NotEmpty(t, reason)
}

func TestModerateDrawingOCRGarbageFallsToPending(t *testing.T) {
	// 图形 clean 但 OCR 通道响应不可解析 → pending,不放行。
	s, _ := drawingStubLLM(t,
		func() string { return `{"verdict":"clean"}` },
		func() string { return "not json at all" },
	)
	verdict, reason, err := s.ModerateDrawing(context.Background(), testStrokes())
	require.NoError(t, err)
	assert.Equal(t, DrawingPending, verdict)
	assert.NotEmpty(t, reason)
}

func TestModerateDrawingTimeoutFallsToPending(t *testing.T) {
	// LLM 挂起超过审核超时 → 调用失败 → pending(不违规也不放行)。
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(300 * time.Millisecond)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"{\"verdict\":\"clean\"}"}}]}`))
	}))
	defer server.Close()

	s := newDrawingModerationService()
	s.client = server.Client()
	s.timeout = 20 * time.Millisecond
	s.resolve = func(_ context.Context, _ *config.Config) (ResolvedAIConfig, error) {
		return ResolvedAIConfig{APIKey: "stub-key", Model: "stub-model", BaseURL: server.URL}, nil
	}

	verdict, reason, err := s.ModerateDrawing(context.Background(), testStrokes())
	require.NoError(t, err)
	assert.Equal(t, DrawingPending, verdict)
	assert.NotEmpty(t, reason)
}

func TestModerateDrawingOCRWordlistHit(t *testing.T) {
	// 图形 clean + OCR 转录命中词表 → ocr 拒绝。
	s, _ := drawingStubLLM(t,
		func() string { return `{"verdict":"clean"}` },
		func() string { return `{"text":"fuck"}` },
	)
	verdict, reason, err := s.ModerateDrawing(context.Background(), testStrokes())
	require.NoError(t, err)
	assert.Equal(t, DrawingOCRHit, verdict)
	assert.Equal(t, "ocr", reason)
}
