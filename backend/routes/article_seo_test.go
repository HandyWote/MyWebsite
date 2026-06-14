package routes

import (
	"encoding/json"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
)

// seedArticle 向 sqlite 内存库写入一篇文章，返回其 ID。
func seedArticle(t *testing.T, article models.Article) uint {
	t.Helper()
	if err := database.GetDB().Create(&article).Error; err != nil {
		t.Fatalf("seed 文章失败: %v", err)
	}
	return article.ID
}

// renderSEO 调用真实 ArticleSEO handler 并返回渲染后的 HTML 字符串与状态码。
// host 用于固定 canonical/og:url 的域名断言。
func renderSEO(t *testing.T, id string, host string) (string, int) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: id}}
	c.Request = httptest.NewRequest("GET", "/articles/"+id, nil)
	if host != "" {
		c.Request.Host = host
	}
	ArticleSEO(c)
	return w.Body.String(), w.Code
}

// T1: 常规文章（有 title/summary/tags/content）应渲染完整 SEO 标签
func TestArticleSEO_T1_常规文章渲染完整SEO(t *testing.T) {
	id := seedArticle(t, models.Article{
		Title:   "Go 并发模式实战",
		Summary: "本文深入讲解 goroutine 与 channel 的常见并发模式。",
		Tags:    "Go,并发,golang",
		Content: "# 正文\n这是正文内容。",
	})

	body, code := renderSEO(t, strconv.FormatUint(uint64(id), 10), "test.example.com")
	assert.Equal(t, 200, code)

	// 非空基础 SEO 标签
	assert.Contains(t, body, "<title>")
	assert.Contains(t, body, `name="description"`)
	assert.Contains(t, body, `rel="canonical"`)
	assert.Contains(t, body, `property="og:title"`)
	assert.Contains(t, body, `property="og:description"`)
	assert.Contains(t, body, `name="twitter:title"`)
	assert.Contains(t, body, `application/ld+json`)
}

// T2: JSON-LD 应可被解析为有效 JSON，且含 keywords（含文章 tags）和 inLanguage=zh-CN
//
// 关键：必须用 encoding/json 真正 unmarshal，而不是 strings.Contains。
// JSONLD 字段从 template.HTML 改为 template.JS 是为修复 html/template 在
// <script type="application/ld+json"> 上下文把 JSON 二次转义（整个 JSON 被包成
// "{...}" 字符串、引号被加反斜杠）的既有 bug。弱断言（子串匹配）无法捕捉这种
// 二次转义——转义后字符串里仍可能含 "keywords"/"zh-CN" 子串。只有把 script 内容
// 当 JSON 解析才能证明搜索引擎能读到真实字段。
func TestArticleSEO_T2_JSONLD含keywords和inLanguage(t *testing.T) {
	tags := "React,性能优化,前端"
	id := seedArticle(t, models.Article{
		Title:   "React 性能优化指南",
		Summary: "useMemo、useCallback 与 memo 的正确使用场景。",
		Tags:    tags,
		Content: "正文内容",
	})

	body, _ := renderSEO(t, strconv.FormatUint(uint64(id), 10), "test.example.com")

	// 解析式断言：提取 JSON-LD script 内容并 unmarshal 成 map
	ld := extractScriptJSON(t, body, "application/ld+json")
	assert.Equal(t, "https://schema.org", ld["@context"], "@context 应为 schema.org")
	assert.Equal(t, "Article", ld["@type"], "@type 应为 Article")
	assert.Equal(t, "React 性能优化指南", ld["headline"], "headline 应为文章标题")

	// inLanguage 字段
	assert.Equal(t, "zh-CN", ld["inLanguage"], "inLanguage 应为 zh-CN")

	// keywords 字段存在，且其字符串值应包含文章 tags 中的各关键字
	keywords, ok := ld["keywords"]
	assert.True(t, ok, "JSON-LD 必须含 keywords 字段")
	kwStr, ok := keywords.(string)
	assert.True(t, ok, "keywords 应为 JSON 字符串类型")
	for _, want := range strings.Split(tags, ",") {
		want = strings.TrimSpace(want)
		if want != "" {
			assert.Contains(t, kwStr, want, "keywords 值应包含 tag: %s", want)
		}
	}
}

// T5: Summary 为空、Content 非空时，description meta 与 JSON-LD description 均应兜底为正文摘要。
//
// 关键：旧断言仅 strings.Index(body, `"description"`) > 0 无法区分"正文兜底"与"空 description"
// （即使 description 为空字符串，JSON-LD 里也仍会出现 "description":"" 的键名）。
// 改为解析式断言：用 extractScriptJSON 取出 JSON-LD map，断言 description 值经 TrimSpace 非空，
// 且包含 seed 文章 Content 中的特征文本子串；同时用 extractMetaContent 断言 meta description 非空。
func TestArticleSEO_T5_Summary为空时正文兜底(t *testing.T) {
	const contentFeature = "正文内容" // seed Content 中的稳定特征子串（stripMarkdown 不会破坏）
	id := seedArticle(t, models.Article{
		Title:   "无摘要文章",
		Summary: "",
		Tags:    "测试",
		Content: "这是一段没有 summary 但有正文内容的文章，应当用正文生成描述。",
	})

	body, _ := renderSEO(t, strconv.FormatUint(uint64(id), 10), "test.example.com")

	// <meta name="description"> 的 content 应非空且含正文兜底内容
	metaDesc := extractMetaContent(t, body, `name="description"`)
	assert.NotEmpty(t, metaDesc, "meta description 不应为空")
	assert.Contains(t, metaDesc, contentFeature, "meta description 应含正文特征文本")

	// JSON-LD description 应为正文兜底：解析 JSON-LD map，断言 description 值非空且含特征子串
	ld := extractScriptJSON(t, body, "application/ld+json")
	desc, ok := ld["description"]
	assert.True(t, ok, "JSON-LD 应含 description 字段")
	descStr, ok := desc.(string)
	assert.True(t, ok, "JSON-LD description 应为 JSON 字符串类型")
	assert.NotEmpty(t, strings.TrimSpace(descStr), "JSON-LD description 经 TrimSpace 后不应为空")
	assert.Contains(t, descStr, contentFeature, "JSON-LD description 应含正文特征文本")
}

// T6: Summary 为空 + 长中文正文时，description 长度应 <= 160（rune），
// 且按 rune 截断，不能产生无效 UTF-8（半个汉字乱码）
func TestArticleSEO_T6_长中文正文按rune截断(t *testing.T) {
	// 构造一段明显超过 160 字的中文正文
	longContent := strings.Repeat("这是用于测试截断逻辑的长中文段落内容。", 30) // 远超 160 字
	id := seedArticle(t, models.Article{
		Title:   "长正文文章",
		Summary: "",
		Tags:    "测试",
		Content: longContent,
	})

	body, _ := renderSEO(t, strconv.FormatUint(uint64(id), 10), "test.example.com")

	desc := extractMetaContent(t, body, `name="description"`)
	assert.NotEmpty(t, desc, "description 不应为空")

	// 按 rune 计数长度 <= 160
	runeLen := len([]rune(desc))
	assert.LessOrEqual(t, runeLen, 160, "description rune 长度应 <= 160，实际 %d", runeLen)

	// 必须是有效 UTF-8（byte 截断中文会产生无效 UTF-8）
	assert.True(t, utf8.ValidString(desc), "description 不是有效 UTF-8，疑似按 byte 截断产生乱码")
}

// T7: canonical 与 og:url 应包含 Request.Host，且不含硬编码的 handywote.top
func TestArticleSEO_T7_canonical动态化按Host(t *testing.T) {
	id := seedArticle(t, models.Article{
		Title:   "Canonical 测试",
		Summary: "验证 canonical 动态化",
		Tags:    "SEO",
		Content: "正文",
	})

	body, _ := renderSEO(t, strconv.FormatUint(uint64(id), 10), "test.example.com")

	assert.Contains(t, body, "test.example.com")
	assert.NotContains(t, body, "handywote.top", "不应残留硬编码的 handywote.top 域名")

	// canonical 与 og:url 应同时包含 host 和 /articles/<id>
	assert.Contains(t, body, `rel="canonical"`)
	assert.Contains(t, body, `property="og:url"`)
	assert.Contains(t, body, "test.example.com/articles/")
}

// T3: 注入有效 viteManifest 时，HTML 应注入正确的 <script src>（必须闭合）与 <link stylesheet>。
//
// 关键：用测试内直接赋值包级变量 viteManifest（不需调 FetchViteManifest、不发 HTTP）。
// 断言 "<script src=...></script>" 的完整闭合标签，而非仅 "<script src" 子串——
// 这能捕获模板 line 47 漏写 </script> 的回归（不闭合的 script 会导致浏览器把后续
// 内容当 JS 解析，整页白屏，正是本任务要修的故障形态）。
func TestArticleSEO_T3_注入有效manifest注入JS与CSS(t *testing.T) {
	// 测试内直接注入有效 manifest
	viteManifest = map[string]ManifestEntry{
		"src/main.jsx": {
			File: "assets/index-test.js",
			CSS:  []string{"assets/index-test.css"},
		},
	}
	// 用例结束（含失败提前退出）后还原 nil，避免污染后续用例
	defer func() { viteManifest = nil }()

	id := seedArticle(t, models.Article{
		Title:   "Manifest 注入测试",
		Summary: "验证 viteManifest 注入后 HTML 含正确的 JS/CSS 引用",
		Tags:    "SEO,前端",
		Content: "正文内容",
	})

	body, code := renderSEO(t, strconv.FormatUint(uint64(id), 10), "test.example.com")
	assert.Equal(t, 200, code)

	// JS：<script src> 必须完整闭合（验证修白屏的核心修复点）
	assert.Contains(t, body, `<script src="/app/assets/index-test.js"></script>`,
		"应注入闭合的 <script src> 标签，指向 manifest 的 File 路径")

	// CSS：<link rel="stylesheet"> 指向 manifest CSS[0]
	assert.Contains(t, body, `<link rel="stylesheet" href="/app/assets/index-test.css">`,
		"应注入 <link rel=stylesheet> 标签，指向 manifest 的 CSS[0] 路径")
}

// T4: viteManifest=nil（manifest 加载失败/降级）时，HTML 不应注入 <script src>，
// 但 T1 的全套 SEO 标签仍应完整——证明"manifest 降级不降 SEO"。
//
// 注意：JSON-LD（type=application/ld+json）与 __INITIAL_DATA__（type=application/json）
// 都是内联 <script>，没有 src 属性，因此 NotContains("<script src") 不会误伤它们。
func TestArticleSEO_T4_manifest为nil时降级且SEO不降级(t *testing.T) {
	viteManifest = nil
	defer func() { viteManifest = nil }()

	id := seedArticle(t, models.Article{
		Title:   "Manifest 降级测试",
		Summary: "viteManifest 为 nil 时不应注入外部 JS/CSS，但 SEO 标签保持完整",
		Tags:    "SEO,降级",
		Content: "正文内容",
	})

	body, code := renderSEO(t, strconv.FormatUint(uint64(id), 10), "test.example.com")
	assert.Equal(t, 200, code)

	// 降级：不注入任何外部 JS 引用
	assert.NotContains(t, body, "<script src",
		"viteManifest=nil 时不应注入 <script src>（无外部 JS 引用）")
	// 降级：不注入 manifest 产物（JS/CSS）。
	// 用 /app/assets/ 特征前缀而非 rel="stylesheet" 全局假设——后者在模板未来加字体/Reset CSS 时会误报。
	// 锁的是"manifest 注入的 JS/CSS 都在 /app/assets/ 下"（Vite assetsDir=assets + base=/app/），
	// 而 favicon /app/avatar.webp 是后端单独服务、不在 /app/assets/ 下，故不会被这条断言误伤。
	assert.NotContains(t, body, "/app/assets/",
		"viteManifest=nil 时不应注入 manifest JS/CSS（/app/assets/ 下无任何产物）")

	// SEO 不降级：T1 全套 SEO 标签仍完整
	assert.Contains(t, body, "<title>")
	assert.Contains(t, body, `name="description"`)
	assert.Contains(t, body, `rel="canonical"`)
	assert.Contains(t, body, `property="og:title"`)
	assert.Contains(t, body, `property="og:description"`)
	assert.Contains(t, body, `name="twitter:title"`)
	// JSON-LD 仍非空且可解析
	ld := extractScriptJSON(t, body, "application/ld+json")
	assert.Equal(t, "Article", ld["@type"], "降级时 JSON-LD 仍应完整可解析")
}

// extractMetaContent 粗略提取 HTML 中首个匹配 meta 标签的 content 属性值。
// 仅用于测试断言辅助。
func extractMetaContent(t *testing.T, html, nameMatch string) string {
	t.Helper()
	// 找到 meta 标签起始位置
	idx := strings.Index(html, nameMatch)
	if idx < 0 {
		return ""
	}
	// 从该位置向后找 content="..."
	rest := html[idx:]
	cIdx := strings.Index(rest, "content=\"")
	if cIdx < 0 {
		return ""
	}
	rest = rest[cIdx+len("content=\""):]
	end := strings.Index(rest, "\"")
	if end < 0 {
		return ""
	}
	return rest[:end]
}

// extractScriptJSON 从 HTML 中提取 <script type="<scriptType>">...</script>
// 的文本内容，并 unmarshal 成 map[string]interface{} 返回。
// 用于强断言 JSON-LD / __INITIAL_DATA__ 注入数据可被正确解析。
//
// 解析式断言而非子串匹配，可守护 html/template 在 script 上下文二次转义 JSON 的 bug：
// 若 JSONLD 用 template.HTML 而非 template.JS，html/template 会把整个 JSON 包成
// JS 字符串字面量（如 "{\"@type\":\"Article\",...}"），此处 unmarshal 会失败或得到
// 意外的字符串类型，断言立刻暴露问题。
func extractScriptJSON(t *testing.T, htmlBody, scriptType string) map[string]interface{} {
	t.Helper()
	// 定位 <script type="<scriptType>"> 起始
	openTag := `<script type="` + scriptType + `">`
	start := strings.Index(htmlBody, openTag)
	if start < 0 {
		t.Fatalf("HTML 中找不到 <script type=%q>", scriptType)
	}
	start += len(openTag)
	end := strings.Index(htmlBody[start:], "</script>")
	if end < 0 {
		t.Fatalf("HTML 中 <script type=%q> 缺少 </script> 闭合", scriptType)
	}
	raw := htmlBody[start : start+end]
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		t.Fatalf("解析 <script type=%q> 内容为 JSON 失败: %v\n原始内容: %s", scriptType, err, raw)
	}
	return m
}
