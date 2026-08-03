# 架构职责清晰度审查报告

- **日期**：2026-08-03
- **范围**：`3Dend/`、`frontend/`、`backend/` 三端全量
- **方法**：4 个只读审查 agent 并行（职责重复 / 职责过度集中 / 效率浪费 / 分层边界），行号以审查时代码为准
- **目标**：定位职责不清、重复实现、过度集中、分层错位的问题，**不含代码修改**

---

## 一、核心结论

1. **前端是重灾区**：`config/api.js` 的 `apiClient` / `getApiUrl` 设计良好，却被 12 个组件绕过各自 `fetch`；GitHub 仓库拉取、site-blocks 拉取、文章列表拉取都存在"一套职责写多份"。
2. **后端 routes 层职责过载**：约 60 处 handler 直接 `database.GetDB()`，无 service/repository 层；`admin_extra.go`、`public.go`、`article_seo.go` 是典型"杂物柜"，多个不相干领域共处一文件。
3. **存在约 400+ 行确证死代码**：未注册的 skills/contacts handler（约 190 行）、前端整套未挂载组件、`aiAnalysis` 冗余状态、`currentArticle` 写后即弃。
4. **文档与代码已脱节**：AGENTS.md 多处描述过期（详见第七节），作为协作主依据会诱导改动落在错层。
5. **3Dend 单点职责过载**：`MonitorScreen.ts` 622 行揉合 5 类职责；且 iframe 加载被 3D 模型下载串行阻塞，拖慢首屏。

---

## 二、前端 API 职责分散

### 2.1 12 个组件绕过 apiClient，重复实现请求管道

- **位置**：`frontend/src/config/api.js:228`（已封装 token 注入 / 401 重定向 / `data.data` 解包 / ApiError）；绕过者：`ArticleDetail.jsx:51`、`ArticleList.jsx:38,69`、`Articles.jsx:26`、`Home.jsx:30,40`、`Sidebar.jsx:44-45`、`CommentSection.jsx:35,60`、`TerminalShellLayout.jsx:66`、`TerminalWelcome.jsx:31-32`、`Login.jsx:39`、`ProjectList.jsx:72`、`PdfViewerOnCanvas.jsx:68`、`Projects.jsx:56`
- **问题**：每处各自重复 `response.ok` 检查、`json()`、`unwrapApiPayload`、错误抛出，且普遍缺失 token 注入与 401 统一处理
- **代价**：后端改统一响应结构时，apiClient 用户自动适应，这 12 处要逐处手改
- **方案（低债）**：组件改用 `config/api.js` 的 `api.*`，删掉各处的 unwrap/错误管道

### 2.2 `getApiUrl` 与 `api.*` 双 URL 约定，隐藏拼接 bug

- **位置**：`config/api.js:248`（`apiClient` 内部再次 `buildApiUrl`）；`siteBlockStore.js:33,60`、`avatarStore.js:19,42,52`、`AdminLayout.jsx:51`、`DataImportExport.jsx:35,85` 把已拼全 URL 的 `getApiUrl.adminXxx()` 传给 `api.*`，导致 BASE_URL **二次拼接**
- **问题**：当前 `BASE_URL=''`（`api.js:35-41`）侥幸可用；一旦设置 `VITE_API_BASE_URL`（文档明示支持）即出 bug
- **方案（低债）**：统一 `api.*` 只收 `API_ENDPOINTS` 原始端点常量；`getApiUrl` 仅用于图片/下载直链等非 apiClient 场景

### 2.3 store 即状态层 + API 层，无独立 domain API

- **位置**：`articleStore.js:37,72,84,96,107`、`aiStore.js:23,39,51,63`、`uploadStore.js:19,32,44`、`commentStore.js:36,52,61,75` 直接 `api.*` 发请求
- **代价**：换 API 实现 / 加缓存 / 加字段映射要逐 store 改；后台文章编辑流程跨 3 个 store 依赖
- **方案（低债）**：按 AGENTS.md 方案 B 抽 `articleApi` / `commentApi` / `siteBlockApi` / `aiApi` 纯函数层，store 只持状态与编排

### 2.4 六个 store 重复同一套 loading/error 模板

- **位置**：`articleStore.js:28-113`、`siteBlockStore.js:30-66`、`avatarStore.js:16-57`、`commentStore.js:24-87`、`aiStore.js:20-70`、`uploadStore.js:16-48`
- **问题**：每个异步 action 都手写 `set({loading,error}) → try/catch → set({loading:false}) → rethrow`
- **方案（低债）**：抽 `withLoading(set, stateKey, fn)` 小 helper 或 `createAsyncAction` 工厂

### 2.5 `clearAuth` 双实现

- **位置**：`config/api.js:213`（注释自述"与 auth.js 的 clearAuth 保持一致"）与 `admin/utils/auth.js:26`
- **方案（低债）**：api.js 改为 `import { clearAuth } from '../admin/utils/auth'`，或抽公共 `utils/auth.js`

---

## 三、前端重复实现（同一职责写多份）

### 3.1 GitHub 仓库拉取 + 本地缓存双实现

- **位置**：`components/Projects.jsx:16-91` vs `components/ProjectList.jsx:13-49,69-153`
- **问题**：缓存键、TTL（按天 vs 3 小时）、映射字段全部不一致，两组件展示数据可能漂移
- **方案（低债）**：抽到现有 `utils/github.js`（已有 `normalizeGitHubUsername`），加 `fetchGithubRepos(username, opts)` + 统一缓存

### 3.2 site-blocks / avatars / 当前头像三段几乎相同的代码

- **位置**：`Home.jsx:28-48`、`Sidebar.jsx:41-65`、`terminal/TerminalWelcome.jsx:28-56`（均为 `Promise.all([siteBlocks, avatars])` → unwrap → `find(is_current)` → avatarFile）
- **注**：Home/Sidebar 当前不在路由树中（见 4.3），但若保留则属重复
- **方案（低债）**：抽 `useProfile()` hook，或在公共侧复用 `siteBlockStore` / `avatarStore`

### 3.3 文章列表拉取四处重复，分页参数前后端不一致

- **位置**：`ArticleList.jsx:38`（`per_page`）、`Articles.jsx:23-26`（`page_size`）、`TerminalShellLayout.jsx:66`（`per_page=100`）、`articleStore.js:28-54`（`per_page`）
- **代价**：后端 `routes/article.go:17` 被迫写 `DefaultQuery("per_page", DefaultQuery("page_size","10"))` 嵌套兼容；协议一改要动 5 处
- **方案（低债）**：在 `api.js` 提供 `getArticles(params)`，或统一复用 `articleStore.fetchArticles`

---

## 四、前端状态层冗余 / 死代码

### 4.1 `articleStore` 双域混杂 + `currentArticle` 写后即弃

- **位置**：`articleStore.js:28-113`（admin 列表 CRUD）+ `116-138`（SEO 注入域）；`App.jsx:57-59` 调用 `injectInitialData` 后丢弃返回值；`ArticleDetail.jsx` 仍无条件 `fetch`
- **问题**：SEO 端到端把整篇文章序列化进 `__INITIAL_DATA__`，但 `currentArticle` 只写不读（grep 确认零读取），`setCurrentArticle` / `getArticleById` 是零调用死 API
- **代价**：直接访问文章页时同一内容下发两次（HTML 内嵌 + JSON API），注入逻辑形同虚设
- **方案（低债）**：二选一——`injectInitialData()` 返回 article 供 `ArticleDetail` 优先消费（命中则跳过 API）；或删掉 `currentArticle` / `setCurrentArticle` / `getArticleById` 死代码

### 4.2 `aiStore` 的 `aiAnalysis` 是纯冗余状态

- **位置**：`aiStore.js:12,28,87`；`ArticleEditDialog` 只读 `aiSuggestions`，`aiAnalysis` 零组件读取、仅测试断言
- **方案（低债）**：删 `aiAnalysis` 字段，保留 `aiSuggestions`，同步改测试

### 4.3 公开 UI 存在整套未挂载组件（新旧两套并存）

- **位置**：`Home.jsx`、`Articles.jsx`、`ContentTabs.jsx`、`SkillsSection.jsx`、`ContactSection.jsx`、`ArticleFilters.jsx`、`Projects.jsx`、`SocialIcons.jsx` 无任何 import（反向依赖已确认）；`ArticleCard` / `ArticlePagination` / `LazyGitHubCalendar` / `LazyImage` 仅被死组件引用
- **实际路由**（`App.jsx:33-38`）：`TerminalWelcome` → `TerminalShellLayout` → `ArticleList` / `ProjectList` / `ArticleDetail`
- **方案（低债）**：删除或移入 `archive/`，消除读者对"当前设计是哪套"的困惑

---

## 五、后端 routes 层职责过载

### 5.1 handler 直接做 DB 访问，无 service/repository 层（最高影响）

- **证据**：`routes/` 下约 60 次 `database.GetDB()`：`admin_article.go:17,21,30,32,52,89,105,152,167`、`article.go:27,48,55,77`、`public.go:35,74,85,96,107,142,145,179,185,205`、`comment.go:25,66,95`、`admin_siteblock.go:34,45,101,109,116,135`、`export_import.go:16-25,93-96`、`system.go:32`、`category_tag.go:13,29`；`services/` 仅 `ai.go` 一个
- **问题**：分页、搜索 ILIKE、评论限流（`comment.go:62-83`）、siteblock JSON 拍平（`public.go:48-69`）等业务规则全在 HTTP 适配层
- **代价**：无法脱离 Gin 单测；未来抽 service 等于重写全部 handler，重构成本最大
- **方案（低债）**：按领域抽 `articleService` / `commentService` / `siteBlockService` / `avatarService`，handler 只做参数校验 + DTO 拼装 + 调 service（AGENTS.md 方案 D）

### 5.2 `admin_extra.go`（225 行）——"杂物柜"

- **位置**：批量删文章 `18-34`、封面上传 `37-64`、PDF 上传 `67-108`、Markdown 导入 `111-200`、5 个薄转发包装 `203-225`
- **问题**：`AdminImportMarkdown` 内联"从第一个 `#` 提取标题"的解析规则；薄包装让改接口要跨文件同步
- **方案（低债）**：拆 `article_import.go` / `article_upload.go`；admin 别名包装集中或让 routes.go 直接指向公共 handler

### 5.3 `public.go`（231 行）——站点数据、头像上传、死代码三坨混杂

- **位置**：SiteBlocks `33-69`、死代码 `GetSkills:72-80` / `GetContacts:83-91`、头像一组 `94-231`（文件落盘 + 事务 + `createThenClearCurrent`）
- **方案（低债）**：拆 `public_siteblock.go` 与 `avatar.go`（上传可下沉 services）；删死函数

### 5.4 `article_seo.go`（300 行）——HTTP 基础设施混入路由文件

- **位置**：Vite manifest 拉取 / 退避重试 / 并发缓存 / 环境变量覆盖 `36-120`、SEO 渲染 `145-246`、`stripMarkdown` `250-300`
- **问题**：路由 handler 文件里内嵌完整 HTTP 客户端；`stripMarkdown` 与 `frontend/src/hooks/useArticleSeo.js:8-17` **完全重复**（代码注释也承认）
- **方案（低债）**：manifest 基础设施抽独立模块（如 `internal/vitemanifest` 或 `services/vite_manifest.go`）；markdown 剥离抽 `utils`；跨端重复用契约测试锁定

### 5.5 分页/参数解析：helper 与内联并存

- **位置**：`helper.go:13` `ParsePaginationParams`、`:31` `ParseUintParam` 已存在且 `admin_article.go` 正确使用；但 `article.go:15-25,70`、`comment.go:18,39`、`public.go:121` 仍内联 `strconv.ParseUint`
- **代价**：调默认分页大小时 helper 用户生效、内联用户漏改，行为不一致
- **方案（低债）**：全部改用 `helper.go` 工具

### 5.6 SiteBlock 序列化双实现

- **位置**：`public.go:48-69` `buildPublicSiteBlockPayload`（content 拍平到顶层）vs `admin_siteblock.go:43-68` `AdminGetSiteBlocks`（只放 content），返回形状不同
- **方案（低债）**：统一 `buildSiteBlockPayload(block, opts)`，public/admin 各传不同 opts

### 5.7 重复定义：双 DTO、重复 PUT 路由

- **位置**：`admin_article.go:63-70` 与 `111-118` 两份几乎相同的 input struct（仅 binding 差异）+ `126-150` 手动 updates map；`routes.go:92-93` `PUT /comments/:id` 与 `PUT /comments/:id/status` 均指向 `AdminUpdateCommentStatus`
- **方案（低债）**：文章字段收敛为单一 DTO（用 `*string` 区分 Create/Update）；评论只保留一个状态路由

### 5.8 `services/ai.go` 内部重复 HTTP 管道 + 配置优先级逻辑重复

- **位置**：`ai.go:119-145` `AnalyzeTextWithAI` 与 `209-234` `TestAIConnection` 重复"构造请求 → marshal → Bearer → Do → 非200诊断"，仅超时不同；`ai.go:49-75` `getAIConfig`（DB 优先 env 兜底）与 `routes/ai.go:56-81` `GetAISetting` 重复该决策
- **方案（低债）**：抽 `callChatCompletion(cfg, messages, timeout)`；让 services 暴露 `GetAIConfigMasked()`，routes 不再自行回退

---

## 六、后端死功能闭环 + 效率浪费

### 6.1 skills/contacts 是"职责存在但无出口"的死闭环

- **证据**：`public.go:72,83`、整份 `admin_skill.go`、整份 `admin_contact.go` 在 `routes.go` **零注册**（`routes_alignment_test.go:46-73` 断言必须 404）；但 `main.go:77-97` 仍 seed、`export_import.go:18-22,60-73` 仍导出/导入
- **代价**：读者以为可管理实际 404；数据可进不可出，约 190 行死 CRUD 误导
- **方案（低债）**：二选一——接通 `GET /api/skills` / `GET /api/contacts` 及 admin CRUD；或删除 handler / 模型 / seed / 导入导出分支

### 6.2 后端列表接口返回整篇正文 content

- **位置**：`routes/article.go:27-58`（`query.Find(&articles)` 未做 `Select`）
- **代价**：列表每个 item 携带完整 Markdown；叠加 6.3 一次导航即序列化 100 篇全文，响应体可达数百 KB
- **方案（低债）**：列表查询 `Select` 排除 `content`，或提供轻量 DTO 接口

### 6.3 文章列表重复请求 + 一次拉 100 篇

- **位置**：`TerminalShellLayout.jsx:55-88`（`per_page=100` 全量标题，仅用于侧栏 `article.title`）与 `ArticleList.jsx:33-57`（`per_page=10`）
- **方案（低债）**：侧栏改轻量 `id,title` 接口（或后端列表默认不带 content），与正文请求共用一份数据

### 6.4 文章搜索无防抖，逐字符请求

- **位置**：`ArticleList.jsx:43-50`（每次按键 `setSearch` → `useEffect` 立即 fetch；服务端 `content ILIKE` 全表扫）
- **方案（低债）**：`useDeferredValue` 或 300ms 防抖，search 变化时合并重置 page

### 6.5 SEO manifest 未就绪时每请求同步阻塞拉取、无超时

- **位置**：`article_seo.go:107-120` `fetchViteManifestWithRetry("",1,0)`，该 `http.Get` 未设超时
- **代价**：前端容器未就绪窗口内，文章页请求可能被长时间挂起，占满 goroutine
- **方案（低债）**：`http.Client` 加 1s 超时；请求级只读一次缓存 + 后台轮询

### 6.6 启动路径串行阻塞

- **位置**：`main.go:24-40` `AutoMigrate → RunMigrations → seedData`（3 次 Count）全部同步在 `r.Run` 前
- **方案（低债）**：seedData 放后台 goroutine 或按需执行；缩短首次可服务时间

---

## 七、3Dend 职责问题

### 7.1 `MonitorScreen.ts`（622 行）揉合 5 类职责

- **位置**：滚轮桥接算法约 `138-258`、鼠标进出状态机 `65-136`、iframe/CSS3D/GL 平面创建 `263-383`、纹理层与淡入 `394-467`、包围平面/透视变暗 `473-578` + 每帧变暗 `593-621`
- **代价**：改滚动桥接要理解纹理层和相机触发；`initializeScreenEvents` 挂全局 `document` 监听，测试需 mock 整个 three 环境
- **方案（低债）**：拆 `WheelBridge`（滚动算法）、`MonitorPointerTracker`（鼠标进出状态机，只发事件）、`TextureLayers`；`MonitorScreen` 只留 iframe 创建 + CSS3D 平面组合

### 7.2 iframe 启动被 3D 模型下载串行阻塞

- **位置**：`World.ts:28-35`（`MonitorScreen` 在 `geometryReady` 回调创建）；`MonitorScreen.ts:263-342`（`iframe.src='/app/'` at `316`）
- **代价**：慢网络首屏等待 = 模型下载 + 前端加载，而非二者取最大
- **方案（低债）**：场景初始化即创建 iframe（不可见/后置遮挡），与 3D 资源并行加载，就位后显示

### 7.3 UI 层空壳 + Utils→UI 依赖反转 + 死代码

- **位置**：`UI/App.tsx:1-5` `createUI`/`createVolumeUI` 为空函数、`UI/index.ts:5-6` 调用无效果；`Utils/Loading.ts:5` import `../UI/EventBus`（loading 特性已移除，无监听者）；`World.ts:7-8` import Cursor/Hitboxes 但 `:33-34` 已注释
- **方案（低债）**：删 UI 空壳或将 EventBus 上移；移除 Loading / Cursor / Hitboxes 死代码

---

## 八、文档与代码不一致（AGENTS.md 过期）

以代码为准，AGENTS.md 以下描述已过期：

| AGENTS.md | 过期描述 | 实际代码 |
| --- | --- | --- |
| `:192,224` | `hooks/useApi.js` 旧 hook 仍存在 | 已删，`hooks/` 只有 useArticleSeo / useNotification |
| `:223` | `utils/apiClient.js` 是另一套 fetch client + 重复 API_ENDPOINTS | 已删，apiClient 已并入 `config/api.js` |
| `:231-239` | articleStore 同时管理封面/Markdown/AI | 已拆 `uploadStore.js` / `aiStore.js` |
| `:204-206` | 默认跳转 articles，ContentTabs 下 ArticleList/ProjectList | 实际 `App.jsx:33-38` 是 index → TerminalWelcome + TerminalShellLayout |
| `:193` | stores 目前主要是 articleStore | 实际 8 个 store |
| `:170` | 注"routes.go 没有注册 skills/contacts" | 仍准确，但应进一步注明代码未收敛（见 6.1） |

- **方案（低债）**：同步更新 AGENTS.md 前端结构与 store 职责两节，删除对已删文件的引用

---

## 执行约定（用户指示，2026-08-03 补充）

- 执行过程中在**合适的地方小步 commit**（一次只动一个领域，沿用 AGENTS.md 工作准则）。
- **所有改动完成且测试通过后**，统一 push 到 Gitea（remote `gitea`，git.unself.cn）。
- 为执行本计划临时安装的用户级 Go 工具链（`~/.local/opt/go`、`~/.bashrc` 中的 PATH/GOPROXY 配置、`/tmp/go1.25.0.linux-amd64.tar.gz`）在 push 完成后**删除**，恢复环境原状。
- 当前环境无系统级 Go，验证需用临时 Go 工具链（本机 go 1.25.0 已装于 `~/.local/opt/go`）。

---

## 九、修复路线图（按风险/收益）

### 🟢 Quick wins — 纯删除 / 纯提取，改动小、立即消债

1. 删 skills/contacts 死 handler（约 190 行）、seed 分支、导入导出分支（6.1）
2. 删前端未挂载死组件或移入 `archive/`（4.3）
3. 删 `aiAnalysis` 冗余状态（4.2）
4. 删 `currentArticle` / `setCurrentArticle` / `getArticleById` 死 API，或让 `injectInitialData` 真正被消费（4.1）
5. 统一分页解析到 `helper.go`（5.5）
6. `clearAuth` 单实现（2.5）
7. 删 3Dend UI 空壳 / Loading / Cursor / Hitboxes 死代码（7.3）
8. 更新 AGENTS.md 过期章节（八）

### 🟡 中期 — 有测试保护下的收敛

1. 组件 `fetch` 收敛到 `api.*`（2.1），先补契约测试再迁移
2. 修 `getApiUrl` 二次拼接隐患，统一 API 端点约定（2.2）
3. GitHub 拉取合并到 `utils/github.js`（3.1）
4. site-blocks/avatars 公共缓存 / `useProfile()`（3.2、2.3 关联）
5. 搜索防抖 + 文章列表去重、去 content（6.2、6.3、6.4）
6. manifest 基础设施抽取 + 请求超时（5.4、6.5）

### 🔴 长期 — 结构性重构（技术债最低但改动大）

1. 后端按领域抽 service 层，handler 瘦身为 HTTP 适配（5.1）
2. 前端抽 domain API 层（`articleApi` 等），store 只持状态（2.3）
3. `MonitorScreen.ts` 按职责拆分（7.1）
4. iframe 与 3D 资源并行加载（7.2）
5. `admin_extra.go` / `public.go` 文件级重组（5.2、5.3）

> 通用原则：任何拆分迁移都**先补契约测试再重构**（沿用 AGENTS.md 方案 B/D），一次只动一个领域，小步提交。
