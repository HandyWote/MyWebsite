# Next.js 迁移、真实 SEO、3D 融合与架构收口完整计划

- **日期**：2026-08-03
- **状态**：需求已逐项确认，待执行
- **范围**：`frontend/`、`3Dend/`、`backend/`、部署与 CI
- **关联审查**：`docs/plans/2026-08-03-architecture-responsibility-review.md`
- **执行方式**：开发与验证完成后，生产维护窗口内一步切换；无迁移期、无生产双轨

---

## 1. 目标

1. 将 React SPA 与 Three.js 站点合并为单一 Next.js 应用，Go 后端继续持有数据和业务规则。
2. 爬虫收到的初始 HTML 直接包含真实页面内容、文章正文、链接和结构化数据，不依赖客户端请求或隐藏的 JSON。
3. 桌面端用户始终在 3D 场景的显示器内浏览公开网页；手机、平板和触摸设备在相同 URL 下直接显示同一份网页内容。
4. 删除 iframe、`postMessage` 桥和旧 `/app/` SPA 运行链，React 与 Three.js 使用同一份真实 DOM。
5. 文章页面使用按需静态生成、精确缓存失效、失败持久化重试和部署后预热。
6. 媒体上传支持 local/S3-compatible 双存储驱动，生产上传链保持“浏览器 → Go → S3”。
7. 完成后端 service/repository 分层、AI 管道收敛、MUI 样式收敛和 Three.js 大版本升级。
8. 建立可阻断合并和发布的 CI、Playwright、SEO、S3 与部署验收。

## 2. 明确不做

- PDF 正文提取和 OCR。
- 多个 Next 实例及共享 ISR 缓存。
- 浏览器直传 S3 或 presigned upload。
- 生产双轨、灰度路由或迁移观察期。

---

## 3. 已确认决策

| ID | 决策 | 结论 |
| --- | --- | --- |
| D1 | 生产切换 | 允许数分钟维护窗口，一次性从旧站切换到新拓扑 |
| D2 | Go 去留 | 保留 Go，负责数据、业务规则、认证、上传、S3 和 revalidation outbox |
| D3 | Next 职责 | 路由、SSR/静态 HTML、SEO、缓存、3D React 壳和 admin UI |
| D4 | 3D 范围 | 桌面端所有公开路由均在 3D 显示器内；admin 不进入 3D |
| D5 | 非桌面端 | 相同 URL 直接显示真实网页，不加载 Three.js、GLB 或 3D 纹理 |
| D6 | DOM 策略 | 一份 SSR DOM；桌面 hydration 后挂入 CSS3DObject，不复制正文、不使用 iframe |
| D7 | 3D 加载 | 模型/贴图全部并行，哪个资源先就绪就先呈现，不等待全量资源 |
| D8 | PDF SEO | HTML 输出标题、摘要、分类、标签和稳定 PDF 链接；PDF 阅读器客户端增强 |
| D9 | 缓存 | 单 Next 实例、持久 cache volume、精确 tags、24 小时兜底刷新 |
| D10 | 刷新失败 | 数据写入不回滚；显示警告，outbox 持久化重试，可手动重试 |
| D11 | S3 | local/S3 双驱动；生产由 Go 上传 S3；数据库保存 object key |
| D12 | S3 迁移 | `HeadObject` 探测，存在则跳过、缺失才上传；可重复执行 |
| D13 | Three 升级 | 生命周期重构完成后，单独升级到实施时最新稳定版并精确锁定 |
| D14 | 后端分层 | `handler → service → repository → GORM/S3`，不使用万能泛型 repository |
| D15 | 发布 | 普通 push/PR 只验证；生产仅版本 tag 或手动触发 |

---

## 4. 当前基线与已知阻断

以下问题必须在迁移前解决：

- `frontend/src/App.jsx` 仍导入已删除的 `components/layout/MainLayout`，当前前端不可构建。
- 前端干净安装后有 5 个测试文件失败，ESLint 有 50 errors、13 warnings。
- `3Dend` 缺少 lockfile 和 `test` script，无法用 `npm ci` 稳定复现。
- GitHub stale-cache 回退把原始 repo 对象直接当 UI DTO，字段形状错误。
- 架构审查文档的“T1-T18 全部完成”结论不准确；后端目前只有评论领域具备 service，routes 仍有大量直接 DB 访问。
- 现有 CI 不执行测试，且 `paths` 配置导致普通代码提交不触发发布 workflow。

基线验收门槛：

```bash
cd frontend && npm ci && npm run lint && npm run test:run && npm run build
cd 3Dend && npm ci && npm test && npm run build
cd backend && go test ./... && go vet ./...
```

要求：构建和测试全绿、ESLint 0 errors；warnings 可登记但不得新增。

---

## 5. 目标架构

```text
浏览器 / 爬虫
        |
        v
edge-nginx :4419
  ├─ 页面、robots、sitemap ──> next-web:3000
  ├─ /api/* ───────────────> backend:5000
  └─ /uploads/* ───────────> backend:5000（local 兼容）

next-web
  ├─ Server Components ────> http://backend:5000
  ├─ 单实例 ISR/Data Cache
  └─ 持久化 .next/cache volume

backend
  ├─ PostgreSQL
  ├─ local 或 S3-compatible 媒体存储
  └─ revalidation outbox worker ──> next-web 内部刷新路由
```

环境地址约定：

- 浏览器 API：相对路径 `/api`。
- Next 服务端 API：`BACKEND_INTERNAL_URL=http://backend:5000`。
- canonical、JSON-LD、sitemap：`PUBLIC_SITE_URL`。
- 媒体公开地址：`S3_PUBLIC_BASE_URL` 或 local `/uploads`。
- Next 镜像构建不得依赖在线数据库或生产 Go API。

---

## 6. 路由与设备行为

| URL | 桌面端 | 手机/平板/触摸设备 | SEO |
| --- | --- | --- | --- |
| `/` | 3D 显示器内欢迎页 | 普通欢迎页 | SSR 完整内容 |
| `/articles` | 3D 显示器内文章列表 | 普通文章列表 | SSR/缓存 |
| `/articles/[id]` | 3D 显示器内完整文章 | 普通完整文章 | 按需静态生成 |
| `/projects` | 3D 显示器内项目列表 | 普通项目列表 | SSR/缓存 |
| `/admin/*` | 普通后台 | 普通后台 | `noindex` |
| `/internal/*` | 不公开 | 不公开 | `noindex`/edge 拒绝 |

桌面判定同时满足：

```text
(min-width: 1024px) and (hover: hover) and (pointer: fine)
```

旧路由永久重定向并保留 query string：

- `/app/` → `/`
- `/app/articles` → `/articles`
- `/app/articles/:id` → `/articles/:id`
- `/app/projects` → `/projects`
- `/app/admin/*` → `/admin/*`

URL 不使用尾部 `/`（根路径除外）。不存在或已删除文章返回真实 HTTP 404。

---

## 7. SSR DOM 与 3D 显示器

### 7.1 单一内容源

`app/(public)/layout.tsx` 持久化公开站壳。每个公开 page 保持 Server Component，服务端把真实内容渲染进固定 `ScreenHost`：

```text
PublicLayout
├─ SceneCanvas（仅桌面加载）
└─ ScreenHost
   └─ 当前路由 Server Component 内容
```

约束：

- HTML 响应中直接存在完整 `ScreenHost` 内容。
- React 管理 `ScreenHost` 的 children；Three.js 只能移动宿主元素和应用 3D transform。
- 桌面端在电脑模型可用后将宿主元素挂入 CSS3DObject。
- 手机、平板、触摸设备不执行 DOM 接管，直接显示 `ScreenHost`。
- 不渲染第二份隐藏 SEO 正文。
- 场景 layout 在公开路由切换时保持实例，只有屏幕内容更新。
- 场景销毁前先归还 DOM 宿主，再卸载 React。

### 7.2 内容渲染

Markdown：

- 服务端输出标题、段落、列表、表格、链接、代码和 KaTeX HTML。
- 客户端只增强需要浏览器能力的交互。
- 正文不得依赖 `useEffect` 后 fetch 才出现。

Mermaid：

- 服务端输出可读源码/说明 fallback。
- 客户端将其增强为 SVG。
- 渲染失败时保留 fallback，不显示空白。

PDF：

- 服务端输出文章标题、摘要、分类、标签和稳定 PDF 链接。
- PDF.js 阅读器仅客户端加载。
- 本计划不提取 PDF 正文，不做 OCR。

### 7.3 3D 渐进加载

- 所有 GLB 和纹理并行请求。
- Resources 从“全部 geometryReady”改为逐资源 `modelLoaded`/`textureLoaded`。
- 每个模型完成后立即创建并加入场景。
- 对应纹理先完成时暂存，模型出现后立即应用；纹理后完成时淡入。
- 电脑模型完成后立即挂载网页屏幕，不等待 environment/decor。
- environment/decor 失败不阻塞电脑和网页。
- 电脑模型失败时提供重试；不自动切换桌面端为普通网页。
- 路由切换不重新请求 3D 资源。

---

## 8. SEO 与静态化标准

每篇 Markdown 文章必须输出：

- 初始 HTML 中的完整正文。
- `title`、`description`、canonical。
- Open Graph 与 Twitter Card。
- 使用绝对地址的封面图。
- 原生 `<script type="application/ld+json">` Article JSON-LD。
- 作者、发布日期、修改日期、`mainEntityOfPage`。
- 安全序列化 JSON-LD，至少转义 `<` 防止注入。

站点级要求：

- 首页输出真实欢迎内容、文章入口和项目入口。
- `/robots.txt` 允许公开页面，禁止 `/admin`、`/internal` 和无需索引的 API。
- `/sitemap.xml` 包含首页、文章列表、项目页和全部文章。
- sitemap 循环请求分页 API，每页最多 100 条，直到取完，并使用 `updated_at` 作为 `lastmod`。
- `/admin`、内部刷新接口和错误页面 `noindex`。
- 旧 `/app/*` 不进入 sitemap。
- 不从请求 Host 推导 canonical；只使用 `PUBLIC_SITE_URL`。

Next 镜像不在 build 时拉取文章。文章使用运行期按需静态生成，部署后由预热脚本遍历 sitemap 请求全部文章。

---

## 9. 缓存与更新机制

显式缓存，不依赖 Next 默认行为：

| 数据 | Tag | 兜底 |
| --- | --- | --- |
| 文章列表/首页文章入口 | `articles:list` | 24 小时 |
| 文章详情/metadata | `article:{id}` | 24 小时 |
| sitemap | `sitemap` | 24 小时 |
| 站点资料 | `site-blocks` | 24 小时 |
| 头像资料 | `profile` | 24 小时 |
| GitHub 项目 | `projects` | 3 小时 |

实现使用明确的 `cache: 'force-cache'`、`next.tags` 和 `next.revalidate`；刷新使用 Next 16 支持的双参数形式，例如 `revalidateTag(tag, 'max')`。页面、metadata 和 JSON-LD复用同一个服务端数据函数。

Go 只发送受控事件，不允许调用方传任意 tag/path：

```json
{
  "entity": "article",
  "action": "update",
  "ids": [123]
}
```

刷新映射：

| 写操作 | 刷新 |
| --- | --- |
| 创建文章 | `articles:list`、`sitemap`，并预热新详情 |
| 更新文章 | `article:{id}`、`articles:list`、`sitemap` |
| 删除文章 | `article:{id}`、`articles:list`、`sitemap` |
| 批量删除/Markdown 导入/数据导入 | 列表、sitemap、全部受影响详情 |
| 修改 site-block | `site-blocks` |
| 修改当前头像 | `profile` |

可靠性：

- 数据库写入与 outbox 记录处于同一事务。
- 后台 worker 调用 Next 内网 POST 路由，2 秒超时。
- 失败按 1 分钟、5 分钟、15 分钟等策略重试，重启后任务不丢失。
- 后台返回“数据已保存但页面刷新失败”的明确警告，不回滚数据。
- admin 提供手动重新刷新操作。
- 内部路由使用独立 token，空 token拒绝，edge 不向公网暴露。

---

## 10. S3-compatible 媒体存储

### 10.1 存储接口

后端提供统一接口：

```text
Save
Delete
Exists / Head
PublicURL
```

驱动：

```env
STORAGE_DRIVER=local|s3
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
S3_FORCE_PATH_STYLE=false
```

规则：

- local 用于本地开发；S3 用于生产。
- 浏览器始终上传到 Go，Go 完成鉴权、MIME/大小校验和 S3 写入。
- 不向浏览器下发 S3 密钥或 presigned URL。
- 数据库存 object key，不存固定域名。
- 公开媒体 URL 由 storage driver 生成。
- 文章公开媒体使用稳定 URL，不使用会过期的下载签名。

对象 key：

```text
avatars/{uuid}.webp
articles/covers/{uuid}.{ext}
articles/pdfs/{uuid}.pdf
articles/assets/{uuid}.{ext}
```

bucket/CDN 至少允许站点域名进行公开 GET/HEAD，保证 PDF.js 可读取 PDF；不开放浏览器写入。

### 10.2 现有文件迁移

提供 `dry-run`、执行、校验三种模式：

1. 扫描 `backend/uploads` 并映射目标 object key。
2. 对每个 key 调用 `HeadObject`。
3. 目标不存在才上传。
4. 目标已存在且大小/元数据匹配则跳过。
5. 目标存在但校验不匹配则报告冲突并停止，不覆盖。
6. 对象确认存在后再更新数据库 key。
7. 支持断点和重复执行，重复运行不重复上传。
8. 完成后逐项校验 DB、object key 和公开 URL。
9. 本地 uploads 保留至回滚窗口结束。

删除失败写入可重试任务；提供默认只报告的孤儿对象扫描，不自动批量删除文章媒体。

### 10.3 测试桶

- 不在 CI 启动 MinIO。
- 使用用户提供的专用测试 S3 桶和最小权限凭据。
- 每次测试使用唯一前缀 `ci/{run-id}/`。
- 测试开始前探测桶状态；发现未知非测试对象则停止，不执行清空。
- 成功、失败和取消路径都在 `finally` 清理本次对象。
- 最终断言专用测试桶为空，但不删除桶本身。
- secrets 不写日志、不进入构建产物。

---

## 11. 后端职责收口

目标层次：

```text
Gin handler → domain service → repository → GORM / storage
```

Repository：

- ArticleRepository
- CommentRepository
- SiteBlockRepository
- AvatarRepository
- AISettingRepository
- RevalidationOutboxRepository

Service：

- ArticleService：CRUD、字段清空、批量、Markdown 导入、outbox。
- CommentService：公开/admin 操作及导出。
- SiteBlockService：公开/admin payload 与写入。
- AvatarService：当前头像事务、上传和删除。
- MediaStorageService：local/S3、校验、迁移和删除重试。
- ExportImportService：编排多个 repository/service。
- AIService：配置解析和上游调用。

验收：

- 除启动/migration、repository 和测试基建外，routes 与 services 不直接调用 `database.GetDB()`。
- handler 只做 HTTP 参数、认证上下文、状态码和 DTO。
- 不建立万能泛型 repository。
- 删除重复评论状态路由，只保留 `/api/admin/comments/:id/status`。
- 统一文章 Create/Update DTO，使用指针/nullable 字段支持显式清空 summary、cover 和 PDF。
- public/admin site-block 序列化规则集中。
- CORS 移除 `*`，生产同域；本地使用 `CORS_ALLOWED_ORIGINS` 白名单。

AI 收口：

- 抽统一 `callChatCompletion(ctx, config, messages, timeout)`。
- 统一请求构造、Bearer、状态检查、解析、timeout、context 和脱敏日志。
- 唯一配置优先级：有效数据库配置 → 环境变量 → 明确未配置错误。
- routes 不重复做配置回退。
- API key 对外只返回掩码。

---

## 12. 前端职责与样式收口

数据访问分为：

- Server API：仅 Server Components/服务端数据函数，使用 `BACKEND_INTERNAL_URL`。
- Browser API：admin 和交互请求，使用相对 `/api`。
- 领域 API：article、comment、siteBlock、avatar、upload、AI、auth。

要求：

- Login 不再原生拼 fetch 管道。
- avatar/upload store 不直接依赖底层通用 client。
- 文章正文、metadata 和页面复用同一数据函数。
- 删除 `injectInitialData`、`useArticleSeo`、`seoNav` 和旧 Vite manifest 注入。
- 修复 GitHub stale-cache DTO；迁移后项目数据使用统一服务端映射和缓存。
- 删除旧 iframe、message bridge、WheelBridge、UA 跳转和 `/app` basename。

MUI 全量整理的定义：

- 颜色、字体、边框、间距和状态进入 theme/tokens。
- 重复样式进入共享组件或 variant。
- 页面特有的一次性布局可保留 `sx`。
- 删除硬编码色值和大段重复 `sx`，不以“零 sx”为目标。
- admin 与公开页面均做桌面/移动截图回归。

---

## 13. Three.js 生命周期与升级

### 13.1 先完成生命周期重构

- Application 从全局单例改为显式实例。
- Renderer 使用 React refs，不使用 `document.querySelector` 挂载。
- Time 保存 RAF id，destroy 时 `cancelAnimationFrame`。
- Sizes、Camera、MonitorPointerTracker 等保存具名 listener 并完整移除。
- 清理 CameraControls、WebGLRenderer、CSS3DRenderer 和 DOM。
- 释放 geometry、material、texture、render target 和 WebGL context。
- 可取消未完成加载与纹理淡入 RAF。
- CameraKeyframes 不再创建第二个 Time。
- 拆除 Camera/Renderer 的隐式 Application 单例循环。
- StrictMode “挂载 → 销毁 → 再挂载”后只允许一个 canvas、一个场景和一个 RAF 循环。

### 13.2 再单独升级 Three

- 升级到实施任务时最新稳定版，package lock 精确锁定。
- 同步兼容 `camera-controls` 与类型定义。
- 迁移 texture `encoding`/`colorSpace`、renderer 输出颜色、灯光和材质 API。
- 验证 GLTFLoader、CSS3DRenderer、遮挡层、屏幕阴影和 smudge layer。
- 使用固定模型、固定相机和固定分辨率截图对比升级前后结果。
- 色彩、亮度、相机、模型位置或遮挡明显漂移时不得合并。

`prefers-reduced-motion` 下仍显示 3D，但关闭自动镜头运动和非必要转场。

---

## 14. 分阶段执行

### 阶段 0：恢复可信基线

- 恢复只渲染 `<Outlet />` 的最小 MainLayout。
- 修复全部前端测试失败和 ESLint errors。
- 为 3Dend 增加 lockfile 与 test script。
- 修复 GitHub stale-cache 字段回归并补组件回归测试。
- 记录三端测试数、构建产物大小、当前路由表和关键页面截图/HTTP 基线。

验收：第 4 节全部命令通过。

### 阶段 1：后端分层、S3 与可靠刷新基础

- 建立领域 repository 和 service，迁移 routes 直接 DB 访问。
- 完成 Article/Comment/SiteBlock/Avatar/ExportImport/AI 职责收口。
- 实现 local/S3 MediaStorageService 和配置。
- 实现幂等媒体迁移、校验、孤儿扫描和删除重试。
- 实现 revalidation outbox、worker 和管理重试接口。
- 收紧 CORS，修复重复路由和文章 DTO 清空语义。

验收：repository/service/route/S3/AI 测试全绿，routes 不再直接访问 DB。

### 阶段 2：Next 骨架、admin 与普通公开页面

- `frontend/` 原地迁移为 Next App Router + TypeScript。
- 精确锁定 Next 16 最新稳定版、React 和 MUI 兼容版本。
- 配置 standalone、MUI App Router SSR、字体、KaTeX 和全局 theme。
- 建立 Server API、Browser API 和领域 API。
- 迁移 admin、认证守卫、stores、上传和错误处理。
- 先以普通 DOM 完成 `/`、`/articles`、详情和 `/projects`。
- 完成 MUI theme/tokens/variants 全量整理。

验收：无 3D 时所有公开页面和 admin 功能完整，SSR 无水合错误。

### 阶段 3：真实 SEO、缓存和发布刷新

- Server Component 完整渲染 Markdown。
- Mermaid fallback + 客户端增强；PDF 使用方案 A。
- 实现 metadata、canonical、OG/Twitter、JSON-LD。
- 实现 robots、全量分页 sitemap、404/noindex。
- 实现显式 tags、24h 兜底和内部刷新事件路由。
- 接通 Go outbox，覆盖所有文章/站点资料写入路径。
- 实现 sitemap 预热脚本。

验收：curl 可见完整正文；创建/更新/删除/失败重试全链路通过。

### 阶段 4：3D 融合与渐进加载

- 将 3Dend 模块和静态资源迁入 Next 所有权目录。
- 实现持久 PublicLayout、ScreenHost 和 CSS3DObject DOM 接管。
- 移除 iframe 和所有桥接逻辑。
- 实现桌面能力检测和移动端不下载 3D。
- 将资源加载改为逐模型/逐纹理呈现。
- 完成生命周期重构和 StrictMode 测试。
- 在生命周期稳定后独立升级 Three.js。

验收：公开路由在桌面显示器内切换；移动端普通 DOM；资源逐项出现；无泄漏；视觉回归通过。

### 阶段 5：部署、CI 与旧链删除

- 新建独立 edge-nginx、next-web、backend compose 拓扑。
- Next standalone 使用 Node 22，挂 `.next/cache` 命名 volume。
- 修正 `/api`、`/uploads`、公开路由、旧 `/app` 重定向和内部路由隔离。
- 新建 verify/release workflows。
- 删除 Go SEO、Vite manifest、旧 templates、旧前端/3D 构建、iframe 测试和 prefetch 注入。
- 更新 routes alignment tests、AGENTS.md 和架构审查执行状态。
- 构建并保存固定旧站镜像，仅用于回滚。

验收：完整候选镜像在测试环境通过第 15 节全部门禁。

### 阶段 6：维护窗口一步上线

1. 确认候选 commit、镜像 digest、环境变量和测试证据。
2. 备份 PostgreSQL、当前 uploads 和旧 compose 配置。
3. 运行 S3 迁移 `dry-run`，确认无冲突。
4. 进入维护状态并停止旧 frontend。
5. 执行 S3 增量迁移与最终校验。
6. 启动 edge-nginx、next-web、backend。
7. 执行 DB migration、health check 和内部连通性检查。
8. 遍历 sitemap 预热全部文章。
9. 执行首页、文章、项目、admin、上传、SEO、3D 冒烟。
10. 全部通过后退出维护状态。

任一步失败即停止发布并按第 16 节回滚。

---

## 15. 测试与 CI 门禁

### 15.1 每次 push/PR

后端：

```bash
go test ./...
go vet ./...
```

Next：

```bash
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
```

要求：测试、类型和构建全绿，ESLint 0 errors；不得以“已有失败”豁免。源码字符串断言改为行为测试。

### 15.2 必测范围

- Repository：查询、事务、not found、批量操作。
- Service：字段清空、导入、删除、outbox、失败回滚边界。
- S3：上传、Head、跳过、冲突、删除、重复执行、dry-run、失败清理。
- AI：DB/env 优先级、timeout、状态错误、解析和 secret 脱敏。
- Next：Server/Browser API、metadata、JSON-LD 安全序列化、revalidate token/event 映射。
- Markdown/Mermaid/PDF fallback 行为。

### 15.3 Playwright

桌面：

- Canvas 有非空像素，模型和纹理按完成顺序出现。
- 真实文章文字存在于 CSS3D 屏幕 DOM。
- 首页、文章、项目均在显示器内导航。
- 浏览器前进/后退、滚轮、键盘和焦点正常。
- 路由切换不增加 canvas、场景、RAF 或监听器。
- 固定相机截图通过视觉阈值。

移动/平板：

- 不请求 Three.js chunk、GLB 和 3D 纹理。
- 直接显示完整内容，交互和布局无重叠。

SEO/发布：

- curl 初始 HTML 能找到文章正文。
- metadata、canonical、JSON-LD、robots、全量 sitemap 正确。
- 旧深链重定向正确，未知文章真实 404。
- 创建、更新、删除、批量、导入后的缓存正确。
- Next 暂时失败时 outbox 保留并在恢复后成功刷新。

### 15.4 Workflow

`verify.yml`：普通 push 和 PR 触发，backend、frontend、S3 与 Playwright 可并行，任一失败阻止合并。

`release.yml`：仅版本 tag 或手动触发；只部署已验证的固定镜像；进入维护窗口后一步切换。

---

## 16. 回滚

保留：

- 切换前数据库备份。
- 切换前 uploads 备份。
- 固定旧站镜像和旧 compose/nginx 配置。
- S3 迁移清单及数据库 key 变更记录。

立即回滚条件：

- 首页或 admin 不可用。
- 文章正文不在初始 HTML。
- 3D 电脑屏幕为空或无法操作。
- `/api`、媒体或 Next 出现持续 5xx。
- S3 文件/数据库校验不一致。
- DB migration、health check 或预热失败。

回滚步骤：

1. 恢复维护状态。
2. 停止新 edge/Next/backend 组合。
3. 如有破坏性 DB 变化，恢复数据库备份。
4. 恢复旧 compose/nginx 和固定旧镜像。
5. 恢复 local uploads 路径。
6. 验证旧首页、文章、admin 和 API 后退出维护状态。

S3 已上传对象不需要在紧急回滚中删除；根据迁移清单后续清理。

---

## 17. 提交与执行纪律

- 使用独立 feature branch 开发；生产切换前 main 保持可发布。
- 每个提交只处理一个领域，使用 conventional commit。
- 结构重构先补行为/契约测试，再迁移实现。
- Three 生命周期重构与 Three 大版本升级分开提交。
- S3 接口实现与生产数据迁移分开。
- 不提交 secrets、测试桶凭据、构建产物或本地缓存。
- 每阶段完成后更新本计划勾选状态和验证命令结果。

## 18. 完成定义

只有同时满足以下条件才算完成：

- 单一 Next 应用承载公开 UI、3D 和 admin。
- 桌面端所有公开页面在 3D 显示器内浏览。
- 手机/平板同 URL 直接显示同一份真实内容且不加载 3D。
- 初始 HTML 含完整 Markdown 正文和正确 SEO 信息。
- iframe、旧 `/app` SPA 和 Go SEO 渲染链全部删除。
- 文章发布后的缓存刷新可追踪、可重试、有 24 小时兜底。
- local/S3 双驱动和幂等迁移通过真实测试桶验证。
- routes/services 不直接访问 GORM，领域 service/repository 完整。
- Three 升级完成且视觉/生命周期回归通过。
- AI、MUI、API 层职责收口完成。
- CI、Playwright、构建、lint、typecheck、go test/vet 全绿。
- 一步上线和旧版本回滚流程均经过演练。
