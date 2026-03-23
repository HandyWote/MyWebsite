# 后台管理与前台配置对齐设计

## 1. 背景与目标
- 当前前台已升级为 Pixel/Terminal 风格，后台管理仍主要覆盖 `about/skills/contacts/avatars/articles/comments`，与前台展示结构不完全一致。
- 目标是“全站前台可配置化”，同时遵循“复用现有组件与已实现字段，最小改动，降低技术债”。

## 2. 已确认决策
- 采用混合复用方案（方案 C）。
- 项目页保持 GitHub 实时数据源，不做后台项目 CRUD。
- 文章列表已有字段与能力优先复用，仅增加“展示配置层”。
- 优先扩展 `site_block`，不大规模新增业务表。

## 3. 架构设计
### 3.1 数据边界
保留现有业务实体表：
- `article`
- `skill`
- `contact`
- `avatar`
- `comments`

使用 `site_block` 统一承载“前台展示配置”，不承载文章实体数据：
- `home`
- `about`
- `sidebar`
- `articles_page`
- `projects_page`
- `global_ui`

### 3.2 API 边界（复用现有）
复用现有接口：
- `GET /api/site-blocks`
- `GET /api/admin/site-blocks`
- `PUT /api/admin/site-blocks`（批量更新）

不新增复杂路由，靠 `block.name` 区分配置域。

### 3.3 前端数据流
- 前台：`Home/Sidebar/ArticleList/ProjectList` 从 `site_blocks` 读取展示配置。
- 兼容策略：先读新 schema，缺失时回退旧字段或默认值。
- 后台：新增“前台配置”统一入口，按 block 分区编辑与保存。

## 4. 配置 Schema（第一版）

### 4.1 `home.content`
- `title`
- `subtitle`
- `author`
- `github_url`
- `github_calendar_url`
- `contact_description`

### 4.2 `about.content`
- `education_background`
- `hobbies`
- `personal_vision`

### 4.3 `sidebar.content`
- `social_links`: `[{ label, type, value, href }]`
- `education`: `[{ school, period, desc }]`
- `tech_stack`: `[{ name, level }]`

### 4.4 `articles_page.content`
- `title`
- `subtitle`
- `empty_text`
- `show_filters`
- `show_pagination`
- `default_page_size`
- `default_sort`

### 4.5 `projects_page.content`
- `github_username`
- `per_page`
- `sort`
- `empty_text`
- `error_text`

### 4.6 `global_ui.content`
- 跨页面共享的小型文案与开关（例如 section 标题文案）。

## 5. 组件改造策略（复用优先）
- `Home.jsx`：保留结构，仅接入统一 block 配置。
- `Sidebar.jsx`：保留布局，去除 `SocialLinks/Education/TechStack` 硬编码数据依赖，改为配置注入。
- `ArticleList.jsx`：保留文章数据逻辑，仅增加页面展示配置注入，不改文章实体字段契约。
- `ProjectList.jsx`：保留 GitHub 实时拉取，接入 `projects_page` 配置（用户名、数量、排序、文案）。
- 后台页面：复用 `AboutManager` 的编辑交互模型，扩展为可编辑多 block 的前台配置页。

## 6. 兼容与迁移策略
- 后端 `public` 接口继续保留 `content` 扁平兼容行为，避免旧前端读取断裂。
- 前端渲染采用“配置优先，默认值兜底”。
- 新增 block 若不存在，后台保存时自动创建。

## 7. 风险与控制
- 风险：`site_block` JSON schema 演化无约束。
- 控制：
  - 前后端分别维护默认 schema 常量。
  - 关键字段加入最小校验与回退逻辑。
  - 通过 TDD 回归覆盖“配置缺失、旧字段、空数据”场景。

## 8. 测试策略（TDD/REG）
- Red：先写失败测试（后端契约 + 前端配置优先与回退）。
- Green：最小实现让测试通过。
- Refactor：提取 `useSiteBlock(name)` 与 schema 默认值工具，减少重复。

## 9. 范围外（本轮不做）
- 项目列表后台 CRUD。
- 大规模数据库拆表重构。
- 后台整体视觉重构。
