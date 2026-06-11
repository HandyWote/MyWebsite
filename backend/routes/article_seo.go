package routes

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
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
var viteManifest map[string]ManifestEntry

// FetchViteManifest 在启动时从 Nginx 拉取 Vite manifest 并缓存。
// manifestURL 为空时默认使用 http://nginx:80/app/.vite/manifest.json。
// 容错：Nginx 未就绪时重试 3 次，间隔 2s。
func FetchViteManifest(manifestURL string) {
	if manifestURL == "" {
		manifestURL = "http://nginx:80/app/.vite/manifest.json"
	}

	for i := 0; i < 3; i++ {
		if i > 0 {
			time.Sleep(2 * time.Second)
		}

		resp, err := http.Get(manifestURL)
		if err != nil {
			log.Printf("[SEO] 拉取 manifest 失败 (尝试 %d/3): %v", i+1, err)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Printf("[SEO] 读取 manifest 失败 (尝试 %d/3): %v", i+1, err)
			continue
		}

		if err := json.Unmarshal(body, &viteManifest); err != nil {
			log.Printf("[SEO] 解析 manifest 失败 (尝试 %d/3): %v", i+1, err)
			continue
		}

		log.Println("[SEO] Vite manifest 加载成功")
		return
	}

	log.Println("[SEO] 警告：Vite manifest 加载失败，SEO 页面的 CSS/JS 可能无法正确加载")
}

// SEOData 包含 SEO 模板渲染所需的全部数据
type SEOData struct {
	Title       string
	Summary     string
	TagsStr     string
	CoverURL    string
	ID          uint
	CreatedAt   string
	UpdatedAt   string
	JSONLD      template.HTML
	ArticleJSON template.HTML
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

	// 构建 JSON-LD 结构化数据
	ldData := map[string]interface{}{
		"@context":         "https://schema.org",
		"@type":            "Article",
		"headline":         article.Title,
		"description":      article.Summary,
		"image":            coverURL,
		"author":           map[string]string{"@type": "Person", "name": "HandyWote"},
		"publisher":        map[string]string{"@type": "Person", "name": "HandyWote"},
		"datePublished":    article.CreatedAt.Format(time.RFC3339),
		"dateModified":     article.UpdatedAt.Format(time.RFC3339),
		"mainEntityOfPage": fmt.Sprintf("%s/articles/%d", baseURL, article.ID),
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
	if entry, ok := viteManifest["src/main.jsx"]; ok {
		jsHref = "/app/" + entry.File
		if len(entry.CSS) > 0 {
			cssHref = "/app/" + entry.CSS[0]
		}
	}

	data := SEOData{
		Title:       article.Title,
		Summary:     article.Summary,
		TagsStr:     article.Tags,
		CoverURL:    coverURL,
		ID:          article.ID,
		CreatedAt:   article.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   article.UpdatedAt.Format(time.RFC3339),
		JSONLD:      template.HTML(string(jsonldBytes)),
		ArticleJSON: template.HTML(string(articleJSON)),
		CSSHref:     cssHref,
		JSHref:      jsHref,
	}

	c.Header("Content-Type", "text/html; charset=utf-8")
	if err := parsedSEOTemplate.Execute(c.Writer, data); err != nil {
		log.Printf("[SEO] 模板渲染失败: %v", err)
	}
}
