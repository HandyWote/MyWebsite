# 后端 SEO 收尾(第一阶段)设计

> 日期:2026-06-14
> 状态:待实施
> 范围:单篇文章页 SEO 可靠化
> 前置:06-11《性能与 SEO 优化设计》已落地约 95%,本阶段为收尾

## 1. 背景

06-11 的 SEO 设计已基本落地:`ArticleSEO` handler、`article_seo.html` 模板、`__INITIAL_DATA__` 注水、动态 basename、iframe 自感知导航、sitemap/robots 动态化、Nginx `/articles/` 分流、Nginx 暴露 `.vite/manifest.json`、移动端跳转——全部就绪。

但存在一个**致命缺口**与若干**数据正确性瑕疵**,使"单篇文章 SEO 可靠"未真正成立:

| 问题 | 现状 | 后果 |
|---|---|---|
| `FetchViteManifest` 未接线 | `main.go` 无任何 manifest 初始化调用 → `viteManifest` 恒为 nil | SEO HTML 不带 `<script>`/`<link>` → 真人直接访问 `/articles/:id` 白屏(对爬虫无害,因 meta 在 head) |
| `<script>` 未闭合 | `article_seo.html:47` `<script src="{{.JSHref}}">` 缺 `</script>` | manifest 接线后会生成未闭合 script |
| 摘要无空值兜底 | `article_seo.go` 直接 `Summary: article.Summary`,无 fallback | 文章未填 summary 时 `<meta name="description" content="">` 为空 → Google 自抓正文,搜索结果摘要不可控 |
| JSON-LD 缺 keywords/inLanguage | `article_seo.go:110-123` 的 `ldData` 无 keywords | 标签只进了已被 Google 忽略的 `<meta name="keywords">`,结构化数据里反而没有 |
| canonical/og:url 硬编码 | 模板写死 `https://handywote.top` | 与 cover URL(用 `Request.Host`)不一致,多域名/反代场景出错 |

爬虫版本(后端模板)反而比真人版本(前端 `useArticleSeo.js`)更简陋——主客颠倒。本阶段修正之。

## 2. 目标与验收标准

直接访问 `/articles/:id` 时:**爬虫拿到完整 SEO 标签 + 结构化数据;真人拿到完整渲染的文章页(不白屏);且有测试盯住防退化。**

验收(7 条,逐条映射到第 7 节):

1. `go test ./routes` 通过
2. `/articles/:id` HTML 中有非空 title / description / canonical / OG / Twitter / JSON-LD
3. JSON-LD 有 `keywords` 和 `inLanguage`
4. CSS/JS 路径在 manifest 存在时能注入
5. `<script>` 标签闭合
6. 浏览器直接打开 `/articles/:id` 能加载 React 文章页
7. manifest 不可用时不产生坏 HTML

## 3. 范围

**碰(4 处):**

- `backend/routes/article_seo.go` — 摘要兜底、JSON-LD 补全、canonical 动态化
- `backend/routes/templates/article_seo.html` — `<script>` 闭合、canonical/og:url 动态化
- `backend/main.go` — **加一行** `routes.FetchViteManifest("")`(接线 manifest,修白屏)
- `backend/routes/article_seo_test.go` — **新建**,锁定上述预期

**明确不碰:**

- `backend/routes/system.go`(sitemap/robots 已满足验收)
- 聚合页(`/articles`、`/tags/:tag`、`/categories/:category`)— 第四阶段
- 性能 / LCP / 移动端 — 第三阶段
- Google Search Console / 百度站长 — 第二阶段
- 不重构 `ArticleSEO` 的函数结构(数据获取与渲染不分离),保持最小改动

## 4. 详细改动

### 4.1 `main.go` — 接线 manifest(白屏修复)

在 `routes.SetupRoutes(r, cfg)`(:46)之后、`r.Run(":"+port)`(:52)之前插入:

```go
// 拉取 Vite 构建产物映射,供 SEO HTML 注入正确的 JS/CSS 路径
routes.FetchViteManifest("")
```

- `FetchViteManifest("")` 内部默认请求 `http://nginx:80/app/.vite/manifest.json`,重试 3 次、间隔 2s。
- 阻塞启动最多 ~6s;由 `docker-compose` 依赖关系保证 Nginx 先就绪。
- 空字符串参数走默认 URL;如需可配置,后续从 `cfg` 读取(本阶段不引入配置项)。

### 4.2 `article_seo.go` — 摘要兜底 + JSON-LD 补全 + canonical 动态化

**(a) 新增纯函数(放在文件末尾):**

```go
// stripMarkdown 剥离常见 markdown 语法,返回纯文本。
// 移植自 frontend/src/hooks/useArticleSeo.js 的 stripMarkdown,保持前后端一致。
// 注意:Go 用 RE2,正则需按 RE2 语法书写(不支持反向引用,本场景不需要)。
func stripMarkdown(text string) string {
    // 依次替换:代码块 ```...```、行内代码 `...`、图片 ![alt](url)、
    //          链接 [text](url)、标题/强调符号 #>*_~-、多余空白
    // ... regexp 替换链 ...
}

// summarizeForSEO 返回 SEO description。
// 优先级:Summary 非空 → Summary;
//        否则 stripMarkdown(Content) 按 rune 截前 160;
//        再否则 → 站点默认描述(与前端 DEFAULT_META.description 一致)。
func summarizeForSEO(article models.Article) string {
    if strings.TrimSpace(article.Summary) != "" {
        return article.Summary
    }
    runes := []rune(stripMarkdown(article.Content))
    if len(runes) > 160 {
        return string(runes[:160])
    }
    if len(runes) > 0 {
        return string(runes)
    }
    return "HandyWote 的文章与技术分享。"
}
```

**关键:按 rune 截断**(`[]rune(...)`),不能按 byte(`content[:160]`),否则中文 UTF-8 多字节字符会被截成半个汉字乱码。

**(b) `ArticleSEO` 改动:**

- 用 `summarizeForSEO(article)` 计算 `seoDescription`,`SEOData.Summary` 和 JSON-LD `description` 都用它(不再直接用 `article.Summary`)。
- JSON-LD `ldData`(`article_seo.go:110-123`)新增:
  - `"keywords": article.Tags`
  - `"inLanguage": "zh-CN"`
- 新增 `canonicalURL := fmt.Sprintf("https://%s/articles/%d", c.Request.Host, article.ID)`,`SEOData` 增加 `CanonicalURL string` 字段,JSON-LD `mainEntityOfPage` 复用它(消除与 `baseURL` 的重复拼接)。
- 协议固定 `https://`(站点全站 HTTPS,Cloudflare 强制);如需支持开发环境 HTTP,后续可读 `X-Forwarded-Proto`,本阶段不做。

### 4.3 `article_seo.html` — script 闭合 + canonical/og:url 动态化

```diff
- <link rel="canonical" href="https://handywote.top/articles/{{.ID}}">
+ <link rel="canonical" href="{{.CanonicalURL}}">
  ...
- <meta property="og:url" content="https://handywote.top/articles/{{.ID}}">
+ <meta property="og:url" content="{{.CanonicalURL}}">
  ...
- {{if .JSHref}}<script src="{{.JSHref}}">{{end}}
+ {{if .JSHref}}<script src="{{.JSHref}}"></script>{{end}}
```

`<link rel="stylesheet">`(line 35)是 void 元素,无需闭合,不动。

### 4.4 `article_seo_test.go` — 测试设计(新建)

`package routes`(同包,可直接访问私有变量 `viteManifest`)。用 `net/http/httptest` 构造请求打 `ArticleSEO`,断言响应 HTML。

**测试用例:**

| 用例 | 场景 | 断言要点 |
|---|---|---|
| T1 | 常规文章(有 title/summary/tags/content) | HTML 含非空 title/description/canonical/og:*/twitter:*/JSON-LD |
| T2 | 同上 | JSON-LD 含 `"keywords"` 与 `"inLanguage":"zh-CN"` |
| T3 | 注入有效 manifest | HTML 含闭合的 `<script src="/app/assets/...js"></script>` 与 `<link ...css>` |
| T4 | `viteManifest = nil`(降级) | HTML 不含 `<script src`、无未闭合 `<script>`,但 T1 的全部 SEO 标签仍完整存在 |
| T5 | `Summary = ""` | `<meta name="description">` 与 JSON-LD `description` 均非空(正文兜底) |
| T6 | `Summary=""` + 长中文正文 | description 长度 ≤ 160 且**无半个汉字乱码**(验证 rune 截断) |
| T7 | 任意 | canonical 与 og:url 含请求 Host,**不含** 硬编码 `handywote.top` |

**manifest 测试策略(不依赖外部服务):**

- 测试**直接赋值**包级 `viteManifest`(T3 注入假 map、T4 置 nil),**不调用** `FetchViteManifest`,**不发任何 HTTP 请求**。
- 每个用例 `defer` 还原 `viteManifest = nil`,避免用例间污染。
- 文章数据沿用项目现有测试 DB setup 模式(参照 `backend/routes/*_test.go`),seed 一篇文章到测试库;不引入新依赖。
- `FetchViteManifest` 函数本身(含重试逻辑)可选地用 `httptest.Server` 起局部服务器单测——仍是测试内起的服务,不属于"外部服务依赖"。本阶段列为可选项。

## 5. 关键工程设计

### 5.1 白屏保证(工程化表述)

**正常态**:`main.go` 启动调 `FetchViteManifest` → 成功缓存 Vite 产物映射 → `ArticleSEO` 从缓存取 `src/main.jsx` 的 `file`/`css` → 注入 `<script src="JSHash">` + `<link href="CSSHash">` → 浏览器加载 React → React 从 `__INITIAL_DATA__` 注水挂载 → 文章页可见。

**保证手段**:T3 测试注入有效 manifest,断言 HTML 含正确且闭合的 script/link 路径。验收第 6 条(浏览器实开)做端到端确认。

### 5.2 降级行为(manifest 不可用时)

`FetchViteManifest` 重试 3 次仍失败 → `viteManifest` 保持 nil → `ArticleSEO` 渲染时 `{{if .JSHref}}` 为假 → HTML **不含** script/link →

- **爬虫**:head 全部 SEO 标签完整,**SEO 不降级**(被索引、富文本、社交预览均正常)。
- **真人**:无法加载 React → 白屏。
- **告警**:后端日志输出 `[SEO] 警告:Vite manifest 加载失败...`(`article_seo.go:70` 现有日志)。

**设计选择(明确接受该降级)**:后端不应因前端构建产物未就绪而拒绝启动(否则 nginx/frontend 构建问题会拖垮全站 API);SEO 价值(被索引)优先于真人首屏,运维通过日志告警发现并修复。T4 测试锁定此降级不产生坏 HTML(验收第 7 条)。

**超出本阶段(记一笔)**:生产可监控 `[SEO] 警告` 日志,或在 `/health` 增加 `viteManifest != nil` 检查,接入告警。

### 5.3 摘要兜底按 rune 截断

- Go `[]rune(s)[:n]` 按 Unicode 码点截断,中文安全。
- 截断长度 160(与前端一致,Google description 建议约 155 字符)。
- 三级兜底:Summary → 正文剥离 markdown后的前 160 rune → 站点默认描述。保证 description **永不空**。
- `stripMarkdown` 为纯函数,易单测(T6 覆盖中文截断 + 乱码检查)。

### 5.4 canonical 与 script 闭合列为必做

- canonical/og:url 改 `{{.CanonicalURL}}`(动态),**必做**(非可选)——消除与 cover URL 域名来源不一致,避免多域名/反代出错。
- `<script src>` 补 `</script>`,**必做**——manifest 接线后必生成 script,未闭合会破坏 HTML 解析。

## 6. TDD 执行顺序

1. 写 `article_seo_test.go`(T1–T7)→ 跑,预期 T2/T3/T4/T5/T6/T7 红(T1 大概率已绿,作为回归基线)。
2. 改 `article_seo.go`(摘要兜底 + JSON-LD 补全 + canonical 动态)→ T1/T2/T5/T6/T7 绿。
3. 改 `article_seo.html`(script 闭合 + canonical/og:url 动态)→ 配合 ②,T3 的"闭合"断言绿。
4. 改 `main.go`(接线一行)→ 单元测试层面无新增(FetchViteManifest 的副作用是启动时行为);渲染逻辑已由 T3/T4 覆盖。
5. `go test ./routes` 全绿;再 `go test ./...` 确认无回归。
6. 端到端(验收 6):本地或 docker 起服务,`curl /articles/:id` 看 HTML 含 `<script src=...>`;浏览器直接打开 `/articles/:id` 确认加载 React、不白屏。

## 7. 验收清单(逐条映射)

| 验收 | 由哪些改动 + 测试保证 |
|---|---|
| 1. `go test ./routes` 通过 | 第 6 节步骤 5 |
| 2. 非空 title/description/canonical/OG/Twitter/JSON-LD | ② 摘要兜底 + canonical 动态;T1 |
| 3. JSON-LD 有 keywords + inLanguage | ② JSON-LD 补全;T2 |
| 4. manifest 存在时注入 CSS/JS | ① main.go 接线 + ②(渲染读 manifest);T3 |
| 5. script 闭合 | ③ 模板补 `</script>`;T3 |
| 6. 浏览器能加载 React 文章页 | ① 接线 manifest;端到端手动验证 |
| 7. manifest 不可用不产生坏 HTML | 降级行为(5.2);T4 |

## 8. 不做的事(范围边界)

- 不重构 `ArticleSEO` 函数结构(不分离数据获取与渲染)。
- 不引入 markdown 渲染(正文进 HTML 是第三阶段)。
- 不做聚合页 SEO(第四阶段)。
- 不接 GSC/百度(第二阶段)。
- 不优化 LCP/3D 性能(第三阶段)。
- 不改 sitemap/robots(已满足)。

## 9. 风险与回滚

| 风险 | 影响 | 缓解 / 回滚 |
|---|---|---|
| manifest URL 在某环境不可达 | 启动阻塞 ~6s 后进入降级(不崩) | 删该行即回滚;降级态 SEO 不降级 |
| `stripMarkdown` RE2 正则与 JS 版差异 | 兜底文本含残留符号 | T6 单测覆盖;纯函数易修 |
| `c.Request.Host` 含端口(开发环境) | canonical 带端口号 | 生产经反代 Host 为域名;开发环境可接受;如需读 `X-Forwarded-Host` |
| 模板改动引入转义问题 | 无 | Go `html/template` 自动转义;`CanonicalURL`/`JSHref` 均为可控字符串 |
| 接线后前端产物路径错误 | script 404 → 仍白屏 | T3 断言路径来自真实 manifest;端到端验证 |

**回滚单元**:每处改动一个独立 commit(`main.go` 接线 / `article_seo.go` / `article_seo.html` / 测试),可单独 `revert`。

## 10. 本阶段在四阶段中的位置

| 阶段 | 状态 |
|---|---|
| 一·后端 SEO 收尾(本文档) | 待实施 |
| 二·接搜索反馈(GSC + 百度站长) | 待设计 |
| 三·性能(首屏正文可见 + LCP) | 待设计 |
| 四·扩展聚合页(`/articles`、`/tags/:tag`、`/categories/:category`) | 待设计 |

每阶段独立设计文档、独立 TDD 实施。
