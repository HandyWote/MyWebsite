package routes

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// resetViteManifest 清空包级 manifest 缓存，避免测试间相互污染
func resetViteManifest() {
	viteManifestMu.Lock()
	viteManifest = nil
	viteManifestMu.Unlock()
}

const validManifestJSON = `{
  "src/main.jsx": {
    "file": "assets/main-abc123.js",
    "css": ["assets/main-abc123.css"]
  }
}`

func TestFetchViteManifestSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetViteManifest()
	t.Cleanup(resetViteManifest)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(validManifestJSON))
	}))
	defer srv.Close()

	FetchViteManifest(srv.URL)

	entry, ok := getViteManifestEntry("src/main.jsx")
	require.True(t, ok, "manifest 应加载成功并可读取条目")
	assert.Equal(t, "assets/main-abc123.js", entry.File)
	assert.Equal(t, []string{"assets/main-abc123.css"}, entry.CSS)

	// 不存在的条目应返回 false
	_, ok = getViteManifestEntry("missing.jsx")
	assert.False(t, ok)
}

func TestFetchViteManifestRetriesOnServerError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetViteManifest()
	t.Cleanup(resetViteManifest)

	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	// 重试 2 次，间隔 0 以加速测试
	fetchViteManifestWithRetry(srv.URL, 2, 0)

	assert.Equal(t, 2, attempts, "失败时应按 attempts 次数重试")
	assert.Nil(t, viteManifest, "全部失败后 manifest 缓存应保持为空")
}

func TestFetchViteManifestRetriesThenSucceeds(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetViteManifest()
	t.Cleanup(resetViteManifest)

	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte(validManifestJSON))
	}))
	defer srv.Close()

	fetchViteManifestWithRetry(srv.URL, 5, 0)

	assert.Equal(t, 3, attempts, "前两次失败后第三次应成功")
	entry, ok := getViteManifestEntry("src/main.jsx")
	assert.True(t, ok)
	assert.Equal(t, "assets/main-abc123.js", entry.File)
}

func TestViteManifestConcurrentReads(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetViteManifest()
	t.Cleanup(resetViteManifest)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(validManifestJSON))
	}))
	defer srv.Close()

	FetchViteManifest(srv.URL)

	// 并发读不应 panic / 数据竞争（go test -race 可验证）
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			entry, ok := getViteManifestEntry("src/main.jsx")
			if ok {
				assert.Equal(t, "assets/main-abc123.js", entry.File)
			}
		}()
	}
	wg.Wait()
}
