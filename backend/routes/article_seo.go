package routes

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "embed"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/database"
	"github.com/handywote/website/models"
)

//go:embed templates/article_seo.html
var seoTemplateFS string

var parsedSEOTemplate = template.Must(template.New("article_seo").Parse(seoTemplateFS))

// ManifestEntry 表示 Vite manifest 中的一个条目
type ManifestEntry struct {
	File string   `json:"file"`
	CSS  []string `json:"css"`
}

// viteManifest 缓存 Vite 构建产物的文件名映射
var (
	viteManifest   map[string]ManifestEntry
	viteManifestMu sync.RWMutex
)

const defaultViteManifestURL = "http://frontend:80/app/.vite/manifest.json"

func resolveViteManifestURL(manifestURL string) string {
	if manifestURL != "" {
		return manifestURL
	}
	if envURL := strings.TrimSpace(os.Getenv("SEO_MANIFEST_URL")); envURL != "" {
		return envURL
	}
	return defaultViteManifestURL
}

// FetchViteManifest 在启动时从 Nginx 拉取 Vite manifest 并缓存。
// manifestURL 为空时默认使用 http://frontend:80/app/.vite/manifest.json。
// 容错：Nginx 未就绪时重试 3 次，间隔 2s。
func FetchViteManifest(manifestURL string) {
	fetchViteManifestWithRetry(manifestURL, 3, 2*time.Second)
}

// StartViteManifestFetch 后台加载 manifest，避免后端启动被前端容器启动顺序阻塞。
func StartViteManifestFetch(manifestURL string) {
	go fetchViteManifestWithRetry(manifestURL, 30, 2*time.Second)
}

func fetchViteManifestWithRetry(manifestURL string, attempts int, delay time.Duration) {
	manifestURL = resolveViteManifestURL(manifestURL)

	for i := 0; i < attempts; i++ {
		if i > 0 {
			time.Sleep(delay)
		}

		resp, err := http.Get(manifestURL)
		if err != nil {
			log.Printf("[SEO] 拉取 manifest 失败 (尝试 %d/%d): %v", i+1, attempts, err)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Printf("[SEO] 读取 manifest 失败 (尝试 %d/%d): %v", i+1, attempts, err)
			continue
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			log.Printf("[SEO] 拉取 manifest 状态码异常 (尝试 %d/%d): %d", i+1, attempts, resp.StatusCode)
			continue
		}

		var manifest map[string]ManifestEntry
		if err := json.Unmarshal(body, &manifest); err != nil {
			log.Printf("[SEO] 解析 manifest 失败 (尝试 %d/%d): %v", i+1, attempts, err)
			continue
		}

		viteManifestMu.Lock()
		viteManifest = manifest
		viteManifestMu.Unlock()
		log.Println("[SEO] Vite manifest 加载成功")
		return
	}

	log.Println("[SEO] 警告：Vite manifest 加载失败，SEO 页面的 CSS/JS 可能无法正确加载")
}

func getViteManifestEntry(entryName string) (ManifestEntry, bool) {
	viteManifestMu.RLock()
	manifest := viteManifest
	viteManifestMu.RUnlock()

	if manifest == nil && gin.Mode() != gin.TestMode {
		fetchViteManifestWithRetry("", 1, 0)
	}

	viteManifestMu.RLock()
	defer viteManifestMu.RUnlock()
	entry, ok := viteManifest[entryName]
	return entry, ok
}

// SEOData 包含 SEO 模板渲染所需的全部数据
type SEOData struct {
	Title        string
	Summary      string
	TagsStr      string
	CoverURL     string
	CanonicalURL string
	ID           uint
	CreatedAt    string
	UpdatedAt    string
	// JSONLD 与 ArticleJSON 在 <script> 上下文中输出原始 JSON 文本。
	// 必须用 template.JS 而非 template.HTML：html/template 在
	// <script type="application/ld+json"> / <script type="application/json">
	// 上下文里仍会把 template.HTML 当作 JS 字符串二次转义（整个 JSON 被包成
	// "{...}" 字符串并对引号加反斜杠），导致搜索引擎/前端解析不到真实字段。
	// template.JS 表示可信 JS，输出原文不转义。
	JSONLD      template.JS
	ArticleJSON template.JS
	CSSHref     string
	JSHref      string
}

// ArticleSEO 处理 GET /articles/:id，返回带完整 SEO 标签的 HTML
func ArticleSEO(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.String(http.StatusBadRequest, "Invalid article ID")
		return
	}

	var article models.Article
	if err := database.GetDB().First(&article, id).Error; err != nil {
		c.String(http.StatusNotFound, "Article not found")
		return
	}

	// 构建绝对 cover URL
	baseURL := "https://" + c.Request.Host
	coverURL := article.Cover
	if coverURL != "" && !strings.HasPrefix(coverURL, "http") {
		coverURL = baseURL + coverURL
	}

	// canonical 动态化：基于当前请求的 Host 拼接，全站 HTTPS
	canonicalURL := fmt.Sprintf("https://%s/articles/%d", c.Request.Host, article.ID)

	// SEO 描述：三级兜底（Summary 非空 → 正文摘要 → 站点默认描述）
	seoDescription := summarizeForSEO(article)

	// 构建 JSON-LD 结构化数据
	ldData := map[string]interface{}{
		"@context":         "https://schema.org",
		"@type":            "Article",
		"headline":         article.Title,
		"description":      seoDescription,
		"image":            coverURL,
		"author":           map[string]string{"@type": "Person", "name": "HandyWote"},
		"publisher":        map[string]string{"@type": "Person", "name": "HandyWote"},
		"datePublished":    article.CreatedAt.Format(time.RFC3339),
		"dateModified":     article.UpdatedAt.Format(time.RFC3339),
		"mainEntityOfPage": canonicalURL,
		"inLanguage":       "zh-CN",
		"keywords":         article.Tags,
	}
	jsonldBytes, _ := json.Marshal(ldData)

	// 序列化文章数据供 React 读取（排除 DeletedAt）
	type articleForJSON struct {
		ID          uint   `json:"id"`
		Title       string `json:"title"`
		Category    string `json:"category"`
		Tags        string `json:"tags"`
		Cover       string `json:"cover"`
		Summary     string `json:"summary"`
		Content     string `json:"content"`
		ContentType string `json:"content_type"`
		PDFFilename string `json:"pdf_filename"`
		CreatedAt   string `json:"created_at"`
		UpdatedAt   string `json:"updated_at"`
	}
	articleJSON, _ := json.Marshal(articleForJSON{
		ID:          article.ID,
		Title:       article.Title,
		Category:    article.Category,
		Tags:        article.Tags,
		Cover:       article.Cover,
		Summary:     article.Summary,
		Content:     article.Content,
		ContentType: article.ContentType,
		PDFFilename: article.PDFFilename,
		CreatedAt:   article.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   article.UpdatedAt.Format(time.RFC3339),
	})

	// 从 Vite manifest 获取 CSS/JS 文件路径
	cssHref := ""
	jsHref := ""
	if entry, ok := getViteManifestEntry("src/main.jsx"); ok {
		jsHref = "/app/" + entry.File
		if len(entry.CSS) > 0 {
			cssHref = "/app/" + entry.CSS[0]
		}
	}

	data := SEOData{
		Title:        article.Title,
		Summary:      seoDescription,
		TagsStr:      article.Tags,
		CoverURL:     coverURL,
		CanonicalURL: canonicalURL,
		ID:           article.ID,
		CreatedAt:    article.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    article.UpdatedAt.Format(time.RFC3339),
		JSONLD:       template.JS(string(jsonldBytes)),
		ArticleJSON:  template.JS(string(articleJSON)),
		CSSHref:      cssHref,
		JSHref:       jsHref,
	}

	c.Header("Content-Type", "text/html; charset=utf-8")
	if err := parsedSEOTemplate.Execute(c.Writer, data); err != nil {
		log.Printf("[SEO] 模板渲染失败: %v", err)
	}
}

// 以下正则与前端 useArticleSeo.js 的 stripMarkdown 保持一致，确保前后端摘要逻辑等价。
// 注意 Go 正则使用 RE2 语法：(?s) 让 . 匹配换行，[\s\S] 同样可用。
var (
	reCodeBlock  = regexp.MustCompile("(?s)```.*?```")       // 围栏代码块
	reInlineCode = regexp.MustCompile("`[^`]*`")             // 行内代码
	reImage      = regexp.MustCompile(`!\[[^\]]*]\([^)]*\)`) // 图片 ![alt](url)
	reLink       = regexp.MustCompile(`\[[^\]]*]\([^)]*\)`)  // 链接 [text](url)
	reMdSymbols  = regexp.MustCompile("[#>*_~-]")            // 标题/强调/引用/删除线符号
	reWhitespace = regexp.MustCompile(`\s+`)                 // 合并多余空白
)

// stripMarkdown 移除 Markdown 语法标记，返回纯文本。
// 实现与 frontend/src/hooks/useArticleSeo.js:8-17 的 stripMarkdown 等价。
func stripMarkdown(text string) string {
	if text == "" {
		return ""
	}
	out := reCodeBlock.ReplaceAllString(text, " ")
	out = reInlineCode.ReplaceAllString(out, " ")
	out = reImage.ReplaceAllString(out, " ")
	out = reLink.ReplaceAllString(out, " ")
	out = reMdSymbols.ReplaceAllString(out, " ")
	out = reWhitespace.ReplaceAllString(out, " ")
	return strings.TrimSpace(out)
}

// 站点默认描述，与前端 DEFAULT_META.description 保持一致。
const defaultSEODescription = "HandyWote 的文章与技术分享。"

// SEO 描述最大长度（按 rune 计数），与前端 slice(0,160) 一致。
const maxSEODescriptionRunes = 160

// summarizeForSEO 生成 SEO 描述，三级兜底：
//  1. 文章 Summary 非空 → 直接用 Summary；
//  2. 否则用 stripMarkdown(Content) 按 rune 截前 160 字；
//  3. 都为空 → 站点默认描述。
//
// 关键：必须按 rune 截断（[]rune），按 byte 截断会把中文 UTF-8 多字节字符切成半个汉字，
// 产生无效 UTF-8（乱码）。
func summarizeForSEO(article models.Article) string {
	if s := strings.TrimSpace(article.Summary); s != "" {
		return s
	}
	plain := stripMarkdown(article.Content)
	if plain != "" {
		runes := []rune(plain)
		if len(runes) > maxSEODescriptionRunes {
			return string(runes[:maxSEODescriptionRunes])
		}
		return plain
	}
	return defaultSEODescription
}
