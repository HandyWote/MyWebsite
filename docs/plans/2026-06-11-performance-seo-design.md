# 性能与 SEO 优化设计

> 日期：2026-06-11
> 状态：待实施

## 背景与目标

### 当前问题

| 问题 | 现状 | 目标 |
|------|------|------|
| **LCP 过慢** | P50: 8,840ms / P75: 11,116ms / P90: 12,308ms | P50 ≤ 4s（桌面端）/ P50 ≤ 3s（移动端） |
| **SEO 搜不到文章** | `/app` 下的文章页被 iframe 隔离，爬虫无法索引 | 文章出现在 Google 搜索结果中 |
| **移动端适配缺失** | 移动端加载完整 3D 场景，体验差 | 移动端直接进入 `/app/`，组件响应式适配 |

### 架构约束

- **部署链路**：本地 NAS（Docker）→ FRP → VPS（OpenResty）→ Cloudflare → 用户
- **3D 场景**：核心特色，不降低质量
- **站点信息**：HandyWote's Blog / handywote.top / 作者 HandyWote
- **CF 免费套餐**：已开启 Brotli、Auto Minify、Early Hints、HTTP/3、Polish

### 当前架构

```
用户访问 / → 3Dend (Three.js 3D 场景)
  → 用户交互触发 iframe → /app/ (React 19 + Vite SPA)
    → 调用 /api/* 获取数据 → 渲染内容
```

核心矛盾：双层 SPA 嵌套导致 LCP 高 + iframe 内的 CSR 内容对爬虫不可见。

---

## 第一部分：SEO — Go 数据注入 + React 渲染

### 1.1 方案概述

在 Go 后端新增 `/articles/:id` 路由，返回一个**极薄的 SEO HTML 壳**，包含：
- 完整的 SEO meta 标签（title、description、keywords、canonical）
- Open Graph 标签（社交分享预览）
- Twitter Card 标签
- JSON-LD 结构化数据（Google 富文本摘要）
- 文章数据 JSON（`__INITIAL_DATA__`，供 React 读取）

然后加载同一个 React App，由 React 渲染 UI。**Go 只负责 SEO 标签，不负责内容渲染**——UI 统一由 React 负责，零视觉差异。

### 1.2 用户路径

```
路径 1：从搜索引擎进入（SEO 路径）
  Google 搜索结果 → /articles/123 → Go 返回 SEO HTML → React 渲染 → 完整文章页

路径 2：从首页 3D 场景进入（不变）
  / → 3D 场景 → iframe → /app/ → React SPA → 文章列表 → 点击文章

路径 3：直接访问 /app/（不变）
  /app/ → React SPA → 正常流程

路径 4：社交分享（新）
  分享 /articles/123 → 平台读取 OG 标签 → 显示预览卡片 → 点击进入
```

### 1.3 Go 后端改动

#### 新增路由

```go
// GET /articles/:id — 返回 SEO HTML
// GET /articles     — 文章列表 SEO 页面（第二阶段，可选）
```

#### SEO HTML 模板 (`backend/templates/article_seo.html`)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- 基础 SEO -->
  <title>{{.Title}} - HandyWote's Blog</title>
  <meta name="description" content="{{.Summary}}">
  <meta name="keywords" content="{{.TagsStr}}">
  <meta name="author" content="HandyWote">
  <link rel="canonical" href="https://handywote.top/articles/{{.ID}}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="{{.Title}}">
  <meta property="og:description" content="{{.Summary}}">
  <meta property="og:image" content="{{.CoverURL}}">
  <meta property="og:url" content="https://handywote.top/articles/{{.ID}}">
  <meta property="og:site_name" content="HandyWote's Blog">
  <meta property="article:published_time" content="{{.CreatedAt}}">
  <meta property="article:modified_time" content="{{.UpdatedAt}}">
  <meta property="article:author" content="HandyWote">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{.Title}}">
  <meta name="twitter:description" content="{{.Summary}}">
  <meta name="twitter:image" content="{{.CoverURL}}">

  <!-- JSON-LD 结构化数据 -->
  <script type="application/ld+json">{{.JSONLD}}</script>

  <!-- React App CSS（从 /app/ 路径加载） -->
  <link rel="stylesheet" href="/app/assets/{{.CSSHash}}.css">

  <!-- Favicon 等静态资源 -->
  <link rel="icon" type="image/x-icon" href="/app/favicon.ico">
</head>
<body>
  <div id="root"></div>

  <!-- 文章数据注入 -->
  <script id="__INITIAL_DATA__" type="application/json">{{.ArticleJSON}}</script>

  <!-- React App JS（从 /app/ 路径加载） -->
  <script src="/app/assets/{{.JSHash}}.js"></script>
</body>
</html>
```

#### Vite manifest 获取机制（启动时 HTTP 拉取）

Go 后端在启动时从 Nginx 拉取 `manifest.json`，解析后缓存在内存中：

```
Go 容器启动
  → HTTP GET http://nginx:80/app/.vite/manifest.json
  → 解析 JSON → 缓存到内存（map[string]ManifestEntry）
  → 渲染 SEO 模板时从缓存读取 CSS/JS hash 文件名
```

**容错**：Nginx 未就绪时重试（最多 3 次，间隔 2s）。docker-compose 中通过 `depends_on` 确保 Nginx 先启动。

**优势**：前端产物更新后 Go 无需重新构建，只需重启即可获取最新 manifest。

#### Nginx 配置改动

```nginx
# 新增：暴露 Vite manifest 供 Go 后端拉取
location = /app/.vite/manifest.json {
    alias /usr/share/nginx/html/app/.vite/manifest.json;
    add_header Cache-Control "no-cache";
}
```

#### JSON-LD 结构

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{.Title}}",
  "description": "{{.Summary}}",
  "image": "{{.CoverURL}}",
  "author": {
    "@type": "Person",
    "name": "HandyWote"
  },
  "publisher": {
    "@type": "Person",
    "name": "HandyWote"
  },
  "datePublished": "{{.CreatedAt}}",
  "dateModified": "{{.UpdatedAt}}",
  "mainEntityOfPage": "https://handywote.top/articles/{{.ID}}"
}
```

#### 数据流程

```
Go handler 收到 GET /articles/123
  → SELECT article FROM db WHERE id = 123
  → 生成 JSON-LD（结构化数据）
  → 序列化文章为 JSON（供 React 使用）
  → 读取构建产物文件名 hash（CSS/JS 文件名）
  → 渲染 HTML 模板
  → 返回完整 HTML
```

### 1.4 React 前端改动

#### 初始数据注入

```
App 初始化：
  1. 检查 window.__INITIAL_DATA__
  2. 如果存在 → 解析 JSON → 注入 Zustand store → 跳过 API 调用
  3. 如果不存在 → 正常从 /api/* 拉取数据
```

#### 动态 Router basename

```js
// 当前：固定 basename = '/app'
// 改为：根据 URL 动态判断
const basename = window.location.pathname.startsWith('/app') ? '/app' : '';
```

#### iframe 自感知导航

SEO 路径下（`/articles/:id`），React 运行在 iframe 外（`window.self === window.top`）。非文章链接需要自动加 `/app/` 前缀，引导用户进入完整 SPA：

```js
// 检测是否在 iframe 外（直接访问 /articles/:id）
const isDirectAccess = window.self === window.top;

// 导航时自动调整路径
function getNavPath(path) {
  if (isDirectAccess && !path.startsWith('/articles/')) {
    return '/app' + path;  // /articles → /app/articles, /projects → /app/projects
  }
  return path;
}
```

**行为**：
- 文章间互相点击 → `/articles/:id`（Go SEO handler，带 SEO 标签）
- 点击"文章列表"、"项目"等 → `/app/articles`、`/app/projects`（进入 /app/ SPA）
- 点击"返回主页" → `/`（3D 场景，符合预期）

#### 构建产物 hash 获取（方案 A：Vite manifest）

使用 Vite 的 `manifest` 功能：构建时生成 `manifest.json`，记录所有产物文件名到原始文件名的映射。Go 启动时读取此文件，从模板中引用正确的 hash 文件名。

```json
// frontend/dist/.vite/manifest.json（Vite 自动生成）
{
  "src/main.jsx": {
    "file": "assets/index-a1b2c3.js",
    "css": ["assets/index-d4e5f6.css"]
  }
}
```

Go 在启动时加载此 manifest，渲染模板时查找对应 entry 的 file 和 css 字段。

### 1.5 Sitemap 修复

当前问题：
1. `/sitemap.xml` 生成 `/articles/123`，但该路径被 3Dend SPA fallback 拦截，返回的是 Three.js 空壳页面
2. `lastmod` 始终为 `time.Now()`，未使用文章实际更新时间
3. 缺少 `<priority>` 元素

修复后：
- URL 生成 `https://handywote.top/articles/123`（Go 后端正确响应）
- `lastmod` 使用 `article.UpdatedAt`
- 首页 `<priority>1.0</priority>`，文章页 `<priority>0.8</priority>`

### 1.6 robots.txt 修复

当前 `robots.txt` 中 sitemap URL 硬编码 `http://`，站点实际使用 `https://`（Cloudflare 强制 HTTPS）。修复为 `https://`。

### 1.7 前端 index.html Bug 修复

`index.html` 中有 5 处 `%BASE_URL%` 占位符（favicon、preload×2、manifest），Vite 不会自动替换此占位符。全部替换为 `./`。

### 1.8 涉及文件

| 文件 | 改动类型 |
|------|---------|
| `backend/routes/article_seo.go` | 新增 — SEO handler |
| `backend/routes/system.go` | 修改 — sitemap lastmod/priority + robots.txt http→https |
| `backend/templates/article_seo.html` | 新增 — SEO HTML 模板 |
| `nginx.web.conf` | 修改 — 新增 `/articles/:id` proxy 规则 + manifest.json 暴露 |
| `frontend/src/App.jsx` | 修改 — 动态 basename + `__INITIAL_DATA__` 读取 + iframe 自感知导航 |
| `frontend/src/store/` | 修改 — 支持注入初始数据 |
| `frontend/vite.config.js` | 修改 — 添加 manifest 生成插件 |
| `frontend/index.html` | 修改 — `%BASE_URL%` → `./`（5 处）+ Clarity async |
| `Dockerfile.web` | 修改 — 构建时注入 prefetch 链接到 3Dend |
| `3Dend/index.html` | 修改 — 添加 `<!-- PREFETCH_INJECT -->` 占位 + 移动端跳转脚本 |

---

## 第二部分：LCP 性能优化

### 2.1 代码级优化措施

#### ① 字体自托管 + 子集化

**问题**：Google Fonts 通过阻塞式 `<link>` 加载，Noto Sans SC 中文字体大，国内访问慢。

**方案**：
- 安装 `@fontsource/jetbrains-mono` 和 `@fontsource/noto-sans-sc`
- 在 `main.jsx` 中 import 字体 CSS
- Noto Sans SC 使用子集化（仅包含常用 6000-10000 字，约 200-500KB vs 全量 16MB）
- 删除 `index.html` 中的 Google Fonts `<link>` 标签
- `@fontsource` 默认启用 `font-display: swap`

**CF 加速**：自托管字体文件随前端部署 → CF 边缘缓存 → 全球快速分发。

**涉及文件**：
- `frontend/package.json` — 新增依赖
- `frontend/src/main.jsx` — import 字体
- `frontend/index.html` — 删除 Google Fonts 链接
- `frontend/vite.config.js` — 字体子集化配置（如需）

#### ② Microsoft Clarity 脚本异步化

**问题**：Clarity 分析脚本同步加载，阻塞渲染。

**方案**：将 Clarity `<script>` 改为异步加载（`defer` 或 `DOMContentLoaded` 后动态插入）。

**涉及文件**：`frontend/index.html`

#### ③ 预取 /app/ 关键资源（P3）

> **优先级调整说明**：prefetch 不影响 LCP 指标。桌面端 LCP 元素是 3D 场景 canvas，而非 iframe 内的文章内容。prefetch 只改善进入 `/app/` 后的第二阶段体感速度，收益有限。

**问题**：3D 场景加载完成后，用户交互触发 iframe 时才开始加载 `/app/`。

**方案**：在 `Dockerfile.web` 构建时注入 prefetch 链接。frontend 构建完成后、3Dend 构建前，提取 `manifest.json` 中的主入口 JS/CSS 文件名，通过 `sed` 注入到 `3Dend/index.html` 的 `<head>` 中。

```bash
# Dockerfile.web 中的构建步骤（伪代码）
# 1. 构建 frontend → 得到 manifest.json
# 2. 提取入口 JS/CSS hash
JS_HASH=$(jq -r '.["src/main.jsx"].file' frontend/dist/.vite/manifest.json)
CSS_HASH=$(jq -r '.["src/main.jsx"].css[0]' frontend/dist/.vite/manifest.json)
# 3. 注入到 3Dend/index.html
sed -i "s|<!-- PREFETCH_INJECT -->|<link rel=\"prefetch\" href=\"/app/${JS_HASH}\"><link rel=\"prefetch\" href=\"/app/${CSS_HASH}\">|" 3Dend/index.html
# 4. 构建 3Dend
```

**涉及文件**：
- `Dockerfile.web` — 新增构建时注入步骤
- `3Dend/index.html` — 添加 `<!-- PREFETCH_INJECT -->` 占位注释

#### ④ 3D 模型加载优化（P1 ↑）

> **优先级调整说明**：3D 模型压缩直接影响桌面端 LCP。LCP 元素是 WebGL canvas，模型加载时间 = LCP 时间。从 P2 提升到 P1。

**方案**：
- 确认 GLB 模型是否使用 Draco 或 Meshopt 压缩（未压缩的 GLB 可能比压缩后大 5-10 倍）
- **Draco 压缩**：使用 `gltf-pipeline` 或 `gltf-transform` 工具对 GLB 进行 Draco 压缩，预期 ~5MB → ~1-2MB
- **Meshopt 压缩**（备选）：比 Draco 解压更快，适合 Web 实时渲染
- 优化加载顺序：先加载主体模型（computer_setup.glb），再加载装饰和环境
- 添加/改善加载进度指示器

**涉及文件**：`3Dend/src/`、`3Dend/static/`（模型文件）

#### ⑤ 前端 bundle 审计与优化

**问题**：`chunkSizeWarningLimit: 1500`（1.5MB），说明有大 chunk。

**方案**：
- 使用 `rollup-plugin-visualizer` 分析构建产物
- 确认 tree-shaking 对 MUI、framer-motion 等库生效
- 确认 pdf、markdown、katex、mermaid 等 chunk 只在对应页面加载（lazy 生效）
- 如有必要，进一步拆分大 chunk

**涉及文件**：`frontend/vite.config.js`、各组件 import

#### ⑥ 图片响应式优化

**方案**：
- `LazyImage.jsx` 增加 `srcset` + `sizes` 属性，提供多种尺寸
- 确保所有图片使用 WebP 格式（CF Polish 可自动转换）
- 大图片考虑使用渐进式加载或低质量占位（LQIP）

**涉及文件**：`frontend/src/components/LazyImage.jsx`


### 2.2 CF 免费功能配置确认

| 功能 | 状态 | 说明 |
|------|------|------|
| Brotli 压缩 | 已开启 | CF Dashboard → Speed → Brotli |
| Auto Minify | 已开启 | CF Dashboard → Speed → Auto Minify (JS/CSS/HTML) |
| Early Hints | 已开启 | CF Dashboard → Speed → Early Hints |
| HTTP/3 (QUIC) | 已开启 | CF Dashboard → Network → HTTP/3 |
| Polish (WebP) | 已开启 | CF Dashboard → Speed → Polish |
| 静态资源缓存 | 自动 | 基于响应头的 Cache-Control |

### 2.3 LCP 优化预估

| 优化项 | 预估 LCP 收益 | 优先级 |
|--------|--------------|--------|
| 移动端跳过 3D 场景 | -3~5s（移动端） | P0 |
| 3D 模型 Draco/Meshopt 压缩 + 加载顺序 | -2~3s（桌面端 LCP 直接环节） | P1 |
| 字体自托管 + 子集化 | -1~1.5s | P1 |
| Clarity 脚本 async | -0.2~0.5s | P1 |
| Bundle 审计优化 | -0.5~1s | P3 |
| 图片响应式 | -0.3~0.5s | P3 |
| 预取 /app/ 资源（不影响 LCP，改善第二阶段体感） | 改善 iframe 加载体感 | P3 |

---

## 第三部分：移动端适配

### 3.1 移动端入口：跳过 3D 场景

**实现**：在 `3Dend/index.html` 的 `<head>` 最前面添加移动端检测脚本：

```html
<script>
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      || window.innerWidth < 768) {
    window.location.replace('/app/');
  }
</script>
```

使用 `location.replace` 确保按"返回"不会回到 3D 场景再跳转。

### 3.2 前端组件响应式适配

需要检查并适配的组件（使用 MUI 断点系统 `xs:0, sm:600, md:900, lg:1200, xl:1536`）：

| 组件 | 桌面端 | 移动端调整 |
|------|--------|-----------|
| Sidebar | 固定左侧 | → Drawer（汉堡菜单触发） |
| ArticleList | 多列卡片 | → 单列卡片 |
| ArticleDetail | 正文 + 侧边栏 | → 单列，侧边栏折叠 |
| ContentTabs | 水平 Tab | → 可滚动 Tab |
| Navbar | 水平布局 | → 适配窄屏 |

**注意**：实施时需要先检查各组件当前的响应式状态，再细化具体改动。

### 3.3 移动端 LCP 链条（优化后）

```
移动端访问 handywote.top
  → 3Dend/index.html 检测移动端 → 立即跳转 /app/
  → 下载 React SPA → 字体 + CSS → 渲染文章列表
  ≈ 2~4s（配合字体优化和 CF 缓存）
```

---

## 实施优先级

| 阶段 | 内容 | 影响范围 |
|------|------|---------|
| **P0** | 移动端跳过 3D 场景 | 移动端 LCP 立竿见影 |
| **P1** | Go SEO 路由 + HTML 模板 + React 数据注入 | SEO 根本解决 |
| **P1** | 字体自托管 + Clarity async | 桌面端 LCP 提升 |
| **P1** | 3D 模型 Draco/Meshopt 压缩 + 加载顺序 | 桌面端 LCP 直接改善（↑） |
| **P2** | 前端响应式组件适配 | 移动端体验完善 |
| **P3** | Bundle 审计 + 图片响应式 | 长期 LCP 改善 |
| **P3** | 预取 /app/ 资源（Dockerfile 构建时注入） | iframe 加载体感改善（↓） |
| **附** | Bug 修复：robots.txt https、sitemap lastmod/priority、%BASE_URL% | SEO + 资源加载正确性 |
