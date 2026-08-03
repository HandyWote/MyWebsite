package routes

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

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

// manifestHTTPClient 拉取 manifest 用的 HTTP 客户端。
// 显式设置超时，避免前端容器未就绪时请求被长时间挂起占满 goroutine。
var manifestHTTPClient = &http.Client{Timeout: 2 * time.Second}

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

		resp, err := manifestHTTPClient.Get(manifestURL)
		if err != nil {
			log.Printf("[SEO] 拉取 manifest 失败 (尝试 %d/%d): %v", i+1, attempts, err)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
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
