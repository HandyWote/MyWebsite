# 后台管理前台配置对齐 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不重构业务实体的前提下，实现“全站前台可配置化”，并确保文章列表已实现字段和组件最大化复用。

**Architecture:** 采用混合复用方案：业务实体仍由现有表与接口维护，前台展示配置统一由 `site_block` 按 block 名承载。前台组件改造为“配置优先、默认值回退”，后台新增统一前台配置编辑页，使用现有 `/api/admin/site-blocks` 批量更新接口。

**Tech Stack:** Go + Gin + GORM, React 19 + Vite + MUI + Vitest

---

### Task 1: 定义前台配置 Schema 默认值与读取工具

**Files:**
- Create: `frontend/src/config/siteBlocks.js`
- Modify: `frontend/src/config/api.js`
- Test: `frontend/src/config/siteBlocks.test.js`

**Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from './siteBlocks';

describe('site blocks defaults', () => {
  it('returns block defaults when block is missing', () => {
    expect(getBlockContent([], 'articles_page')).toEqual(SITE_BLOCK_DEFAULTS.articles_page);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:run -- src/config/siteBlocks.test.js`
Expected: FAIL with module/function not found.

**Step 3: Write minimal implementation**

```js
export const SITE_BLOCK_DEFAULTS = { articles_page: { title: 'Articles' } };
export const getBlockContent = (blocks, name) => {
  const found = (blocks || []).find((b) => b.name === name);
  return found?.content || SITE_BLOCK_DEFAULTS[name] || {};
};
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:run -- src/config/siteBlocks.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/config/siteBlocks.js frontend/src/config/siteBlocks.test.js frontend/src/config/api.js
git commit -m "feat(frontend): add site block defaults and reader"
```

### Task 2: 后端站点块契约测试覆盖新 block 与兼容行为

**Files:**
- Modify: `backend/routes/public_siteblocks_test.go`
- Modify: `backend/routes/admin_article_test.go`
- Optional Modify: `backend/routes/public.go`

**Step 1: Write the failing test**

```go
func TestBuildPublicSiteBlockPayload_ContentObjectAndFlatten(t *testing.T) {
    block := models.SiteBlock{Name: "articles_page", Content: `{"title":"文章","show_filters":true}`}
    payload := buildPublicSiteBlockPayload(block)
    assert.Equal(t, "文章", payload["title"])
    assert.Equal(t, true, payload["show_filters"])
}
```

**Step 2: Run test to verify it fails**

Run: `cd backend && go test ./routes -run SiteBlock -v`
Expected: FAIL for missing scenario/assertion.

**Step 3: Write minimal implementation**

- 若测试失败源于兼容细节，修正 `buildPublicSiteBlockPayload` 或其测试夹具。
- 确保 `content` 对象可用且兼容扁平字段。

**Step 4: Run test to verify it passes**

Run: `cd backend && go test ./routes -run SiteBlock -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/routes/public_siteblocks_test.go backend/routes/admin_article_test.go backend/routes/public.go
git commit -m "test(api): cover site block schema and compatibility"
```

### Task 3: Sidebar 改造为配置驱动并保留现有组件结构

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/components/sidebar/SocialLinks.jsx`
- Modify: `frontend/src/components/sidebar/Education.jsx`
- Modify: `frontend/src/components/sidebar/TechStack.jsx`
- Test: `frontend/src/components/Sidebar.test.jsx`

**Step 1: Write the failing test**

```jsx
it('renders social/education/tech stack from sidebar block', async () => {
  // mock /api/site-blocks includes sidebar.content.social_links etc.
  // assert rendered labels come from API config data
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:run -- src/components/Sidebar.test.jsx`
Expected: FAIL because current child components are hardcoded.

**Step 3: Write minimal implementation**

- `Sidebar.jsx` 读取 `sidebar` block 并将数组 props 传入子组件。
- `SocialLinks/Education/TechStack` 保留样式，只改为优先使用 props 数据，空值回退旧默认常量。

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:run -- src/components/Sidebar.test.jsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/Sidebar.jsx frontend/src/components/sidebar/SocialLinks.jsx frontend/src/components/sidebar/Education.jsx frontend/src/components/sidebar/TechStack.jsx frontend/src/components/Sidebar.test.jsx
git commit -m "feat(frontend): drive sidebar sections from site blocks"
```

### Task 4: ArticleList 接入 `articles_page` 展示配置（复用已有字段）

**Files:**
- Modify: `frontend/src/components/ArticleList.jsx`
- Modify: `frontend/src/components/Articles.test.jsx`

**Step 1: Write the failing test**

```jsx
it('uses articles_page config text and falls back to defaults', async () => {
  // mock site-blocks with articles_page.title/empty_text
  // assert header and empty text are config-driven
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:run -- src/components/Articles.test.jsx`
Expected: FAIL since ArticleList currently hardcodes texts.

**Step 3: Write minimal implementation**

- 在不改变文章实体映射逻辑前提下，新增 `articles_page` 配置读取。
- 标题/副标题/空态文案使用配置值。
- 若配置缺失，沿用当前硬编码文案。

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:run -- src/components/Articles.test.jsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/ArticleList.jsx frontend/src/components/Articles.test.jsx
git commit -m "feat(frontend): add articles page display config"
```

### Task 5: ProjectList 接入 `projects_page` 配置（保留 GitHub 实时）

**Files:**
- Modify: `frontend/src/components/ProjectList.jsx`
- Modify: `frontend/src/components/Projects.test.jsx`

**Step 1: Write the failing test**

```jsx
it('uses projects_page github_username and per_page for github fetch', async () => {
  // mock site-blocks and verify github request URL contains configured username/per_page
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:run -- src/components/Projects.test.jsx`
Expected: FAIL with fixed `HandyWote` usage.

**Step 3: Write minimal implementation**

- `ProjectList` 先读 `projects_page` 配置。
- GitHub API 用户名、单页大小、错误文案从配置获取。
- 数据来源保持 GitHub 实时，不新增后台项目 CRUD。

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:run -- src/components/Projects.test.jsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/ProjectList.jsx frontend/src/components/Projects.test.jsx
git commit -m "feat(frontend): make project list github source configurable"
```

### Task 6: 新增后台“前台配置”页面并接入路由

**Files:**
- Create: `frontend/src/admin/components/FrontendConfigManager.jsx`
- Modify: `frontend/src/admin/components/AdminLayout.jsx`
- Modify: `frontend/src/admin/routes.jsx`
- Test: `frontend/src/admin/components/AdminRealtimeSockets.test.jsx`

**Step 1: Write the failing test**

```jsx
it('frontend config manager loads and saves site blocks via admin api', async () => {
  // render page, mock GET/PUT /api/admin/site-blocks, assert called with blocks payload
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:run -- src/admin/components/AdminRealtimeSockets.test.jsx`
Expected: FAIL because page/route not registered.

**Step 3: Write minimal implementation**

- 新页面按分区编辑 `home/about/sidebar/articles_page/projects_page/global_ui`。
- 保存时使用已存在 `PUT /api/admin/site-blocks` 批量更新。
- `AdminLayout` 新增 Tab；`routes.jsx` 新增 `/admin/frontend-config` 路由。
- 不移除 `AboutManager`，先并存。

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:run -- src/admin/components/AdminRealtimeSockets.test.jsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/admin/components/FrontendConfigManager.jsx frontend/src/admin/components/AdminLayout.jsx frontend/src/admin/routes.jsx frontend/src/admin/components/AdminRealtimeSockets.test.jsx
git commit -m "feat(admin): add frontend config manager based on site blocks"
```

### Task 7: 后端管理端校验与默认 block 初始化（最小）

**Files:**
- Modify: `backend/routes/admin_article.go`
- Modify: `backend/routes/admin_article_test.go`

**Step 1: Write the failing test**

```go
func TestAdminUpdateSiteBlocks_IgnoreEmptyNameAndUpsert(t *testing.T) {
    // payload includes empty name + valid block
    // assert valid block upserted, empty skipped
}
```

**Step 2: Run test to verify it fails**

Run: `cd backend && go test ./routes -run AdminUpdateSiteBlocks -v`
Expected: FAIL on missing/weak validation behavior.

**Step 3: Write minimal implementation**

- 保持现有 upsert 逻辑。
- 增加最小字段校验与错误信息一致性，确保空 `name` 不污染数据。

**Step 4: Run test to verify it passes**

Run: `cd backend && go test ./routes -run AdminUpdateSiteBlocks -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/routes/admin_article.go backend/routes/admin_article_test.go
git commit -m "fix(api): harden admin site blocks upsert validation"
```

### Task 8: 全量回归与文档同步

**Files:**
- Modify: `docs/plans/2026-03-23-admin-config-alignment-design.md`
- Optional Modify: `README.md`

**Step 1: Write failing verification checklist**

```md
- backend site block contract tests
- frontend sidebar/article/project/admin config tests
- lint + smoke
```

**Step 2: Run tests to confirm baseline failures before final fixes (if any remain)**

Run:
- `cd backend && go test ./routes -v`
- `cd frontend && npm run test:run -- src/components/Sidebar.test.jsx src/components/Articles.test.jsx src/components/Projects.test.jsx src/admin/components/AdminRealtimeSockets.test.jsx`

Expected: 全部 PASS；若失败，记录并回到对应任务最小修复。

**Step 3: Run quality checks**

Run:
- `cd frontend && npm run lint`

Expected: PASS 或记录现有非本次引入问题。

**Step 4: Update docs with final schema and route mapping**

- 在设计文档补充最终字段与兼容说明。

**Step 5: Commit**

```bash
git add docs/plans/2026-03-23-admin-config-alignment-design.md README.md
git commit -m "docs: finalize frontend-config schema and rollout notes"
```
