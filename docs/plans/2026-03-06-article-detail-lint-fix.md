# ArticleDetail Lint Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the current ESLint errors and Hook warnings from `ArticleDetail.jsx` without changing page behavior.

**Architecture:** Keep the component structure intact and use a narrow refactor. Stabilize async fetch functions with real dependencies, then remove unused variables and regex noise so lint passes without disabling rules.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, ESLint

---

### Task 1: 为文章加载行为写失败测试

**Files:**
- Create: `frontend/src/components/ArticleDetail.test.jsx`
- Test: `frontend/src/components/ArticleDetail.test.jsx`

**Step 1: Write the failing test**

渲染 `ArticleDetail`，模拟路由参数和文章详情接口，断言页面最终显示文章标题。

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/ArticleDetail.test.jsx`
Expected: FAIL because the test file is new and production code is not yet adapted for the test expectations.

**Step 3: Write minimal implementation**

只补足测试所需的 mock 与渲染入口，不提前修改业务逻辑。

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/ArticleDetail.test.jsx`
Expected: PASS for the article loading assertion.

### Task 2: 为分享回退行为写失败测试

**Files:**
- Modify: `frontend/src/components/ArticleDetail.test.jsx`
- Test: `frontend/src/components/ArticleDetail.test.jsx`

**Step 1: Write the failing test**

在 `navigator.share` 不可用时点击分享按钮，断言 `navigator.clipboard.writeText` 被调用。

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/ArticleDetail.test.jsx`
Expected: FAIL because the current test scaffolding does not yet cover the share fallback path.

**Step 3: Write minimal implementation**

补齐测试需要的浏览器 API mock 和按钮交互。

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/ArticleDetail.test.jsx`
Expected: PASS for both test cases.

### Task 3: 最小修改组件以消除 lint 问题

**Files:**
- Modify: `frontend/src/components/ArticleDetail.jsx`
- Test: `frontend/src/components/ArticleDetail.test.jsx`

**Step 1: Write the failing check**

Run: `npm run lint -- src/components/ArticleDetail.jsx`
Expected: FAIL with the 5 errors and 2 warnings reported by ESLint.

**Step 2: Write minimal implementation**

按以下顺序修改：
- 移除未使用导入和变量。
- 修正无效正则转义。
- 让 `fetchArticle` 与 `fetchComments` 具有稳定依赖，并修复 `useEffect` 警告。

**Step 3: Run verification**

Run: `npm run test:run -- src/components/ArticleDetail.test.jsx`
Expected: PASS

Run: `npm run lint`
Expected: PASS or only unrelated pre-existing issues outside this task scope.
