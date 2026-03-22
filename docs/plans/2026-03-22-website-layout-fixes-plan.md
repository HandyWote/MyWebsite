# 网站布局重构问题修复计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复前台布局的 8 个问题：数据获取、样式配色、间距、交互跳转、Section 分割线等。

**Design Guidance:** 本计划使用 @frontend-design skill 作为设计指导原则，确保：
- 遵循 Terminal Aesthetics TUI 风格
- 使用 JetBrains Mono 等宽字体
- 采用深色主题 (GitHub Dark 风格)
- 实现醒目的交互反馈和高对比度配色
- 保持像素风格的边框和视觉元素

**Architecture:**
- 复用项目现有的 `useApi` hook、API 配置 (`getApiUrl`)、响应解包 (`unwrapApiPayload`)、错误处理 (`errorHandler`)
- 参考 `Home.jsx`、`Articles.jsx`、`Projects.jsx` 中已有的数据获取模式
- 保持 Terminal Aesthetics TUI 风格

**Tech Stack:** React 19, MUI 6, Framer Motion 12, React Router 7, Lucide React

---

## 前置任务

### Task 0: 分析现有代码结构

**Files:**
- Read: `frontend/src/components/Home.jsx`
- Read: `frontend/src/components/Articles.jsx`
- Read: `frontend/src/components/Projects.jsx`
- Read: `frontend/src/config/api.js`
- Read: `frontend/src/hooks/useApi.js`
- Read: `frontend/src/utils/errorHandler.js`

**Step 1: 阅读 Home.jsx 了解数据获取模式**

```bash
cat frontend/src/components/Home.jsx
```

**Step 2: 阅读 Articles.jsx 了解文章列表数据获取**

```bash
cat frontend/src/components/Articles.jsx
```

**Step 3: 阅读 Projects.jsx 了解 GitHub API 调用**

```bash
cat frontend/src/components/Projects.jsx
```

**Step 4: 阅读 api.js 了解 API 配置**

```bash
cat frontend/src/config/api.js
```

---

## P0 优先级：数据获取修复

### Task 1: 修复 Sidebar.jsx 数据获取

**Design Direction** (@frontend-design skill):
- TUI 风格的侧边栏，信息清晰分层
- 使用 JetBrains Mono 等宽字体
- 头像使用 PixelAvatar 组件显示
- slogan 末尾闪烁光标效果增强终端感

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`

**问题**: 头像、名字、slogan 使用硬编码，未从后端获取。

**正确模式** (参考 Home.jsx):
```javascript
// 从 siteBlocks API 获取数据
const res = await fetch(getApiUrl.siteBlocks());
const data = await res.json();
const payload = unwrapApiPayload(data);
const homeBlock = (payload || []).find(b => b.name === 'home');
// 使用 homeBlock.avatar, homeBlock.title, homeBlock.subtitle
```

**修复步骤**:

1. 添加 `useState` 和 `useEffect`
2. 添加 `getApiUrl` 和 `unwrapApiPayload` 导入
3. 创建 `fetchSiteData` 函数从 `/api/site-blocks` 获取数据
4. 解析 `home` block 获取 avatar、title、subtitle
5. 替换硬编码的 `src="/avatar.jpg"` 为 `src={avatarUrl}`
6. 替换 `name@host` 为 `siteTitle`
7. 替换 `$ slogan text` 为 `siteSubtitle`
8. 添加 loading 状态处理（显示占位符）
9. 添加 error 处理（fallback 到硬编码数据）
10. 验证数据正确显示

**Design Notes** (@frontend-design):
- 头像加载中显示占位符动画
- 文字使用 `fontFamily: 'JetBrains Mono, monospace'`
- 保持深色背景 (`bg-secondary`) 上的高对比度文字

**验证**: 启动 `npm run dev`，侧边栏应显示从后端获取的头像、名字、slogan。

---

### Task 2: 修复 ArticleList.jsx 数据获取

**Design Direction** (@frontend-design skill):
- 终端列表风格：`$ ls -la ./articles/` 头部
- 使用 `▸` 前缀标记可点击项
- 日期、标题、标签使用等宽字体
- hover 效果：边框变蓝 + 位移增强可点击感

**Files:**
- Modify: `frontend/src/components/ArticleList.jsx`

**问题**: 文章列表使用硬编码数据 `ARTICLES` 数组。

**正确模式** (参考 Articles.jsx):
```javascript
const fetchArticles = async () => {
  setLoading(true);
  try {
    const res = await fetch(getApiUrl.articles());
    const data = await res.json();
    const payload = unwrapApiPayload(data);
    setArticles(payload.articles || payload || []);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => { fetchArticles(); }, []);
```

**修复步骤**:

1. 添加 `useState` 和 `useEffect`
2. 添加 `getApiUrl` 和 `unwrapApiPayload` 导入
3. 添加 `useNavigate` 导入（用于跳转详情页）
4. 用空数组 `[]` 替换硬编码的 `ARTICLES`
5. 创建 `fetchArticles` 函数调用 `getApiUrl.articles()`
6. 解析响应获取文章列表（注意：`unwrapApiPayload` 解包后可能是 `{ articles: [...] }` 或直接是数组）
7. 添加 `loading` 状态（显示加载动画）
8. 添加 `error` 状态
9. 保留硬编码的 `ARTICLES` 作为 fallback，以防 API 失败
10. 验证文章列表正确显示

**Design Notes** (@frontend-design):
- 加载状态使用 TUI 风格的闪烁光标
- 错误状态显示 `Error: failed to fetch` 的终端风格提示
- 文章项 hover 效果：`borderColor: 'accent.blue'` + `transform: translateX(4px)`

---

### Task 3: 修复 ArticleList 跳转详情

**Design Direction** (@frontend-design skill):
- 点击反馈要即时且明显
- 使用 Framer Motion 添加点击涟漪或缩放效果
- 保持 TUI 风格的视觉语言

**Files:**
- Modify: `frontend/src/components/ArticleList.jsx`

**问题**: 点击文章卡片无法跳转到详情页。

**修复步骤**:

1. 确保已导入 `useNavigate` from `react-router-dom`
2. 在 `ArticleList` 组件中添加 `const navigate = useNavigate();`
3. 在 `ArticleItem` 组件中接收 `navigate` prop
4. 给 `PixelCard` 添加 `onClick` 处理器：
```jsx
<PixelCard
  onClick={() => navigate(`/articles/${article.id}`)}
  sx={{
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    '&:hover': {
      borderColor: 'accent.blue',
      transform: 'translateX(4px)',
    },
  }}
>
```
5. 验证点击文章能正确跳转到 `/articles/:id`

---

### Task 4: 修复 ProjectList.jsx GitHub API

**Design Direction** (@frontend-design skill):
- 富卡片风格，每个项目独立卡片
- 技术栈使用 PixelChip 标签
- Stars/Forks 使用终端风格符号（★/⑂）
- 强调色用于可点击元素

**Files:**
- Modify: `frontend/src/components/ProjectList.jsx`

**问题**: 项目列表使用硬编码数据，未调用 GitHub API。

**正确模式** (参考 Projects.jsx):
```javascript
// GitHub API 调用
const response = await fetch(
  `https://api.github.com/users/${username}/repos?sort=updated&per_page=6`,
  { headers: { 'Accept': 'application/vnd.github.v3+json' } }
);
const data = await response.json();
const projects = data.map(repo => ({
  id: repo.id,
  name: repo.name,
  description: repo.description,
  tags: repo.topics?.slice(0, 3) || [repo.language],
  stars: repo.stargazers_count,
  forks: repo.forks_count,
  updatedAt: formatRelativeTime(repo.updated_at),
  url: repo.html_url,
}));
```

**修复步骤**:

1. 添加 `useState` 和 `useEffect`
2. 用空数组 `[]` 替换硬编码的 `PROJECTS`
3. 创建 `fetchProjects` 函数
4. 调用 GitHub API `https://api.github.com/users/HandyWote/repos?sort=updated&per_page=6`
5. 映射 GitHub API 响应到项目卡片需要的字段
6. 添加 `loading` 和 `error` 状态
7. 保留硬编码数据作为 fallback
8. 验证项目列表正确显示

**Design Notes** (@frontend-design):
- 加载状态：显示 `▊` 字符动画
- 项目卡片 hover：`borderColor: 'accent.blue'`
- Stars 使用黄色 `★` 强调
- Forks 使用灰色 `⑂`

---

### Task 5: 修复 ProjectList 跳转链接

**Design Direction** (@frontend-design skill):
- 点击项目应该外部打开 GitHub 仓库
- 保持 TUI 风格但不打断用户流程
- 使用 `target="_blank"` 在新标签页打开

**Files:**
- Modify: `frontend/src/components/ProjectList.jsx`

**问题**: 点击项目卡片无法跳转到 GitHub 仓库。

**修复步骤**:

1. 在 `ProjectCard` 中添加 `component="a"` 和 `href` 属性
2. 使用 `target="_blank"` 在新标签页打开
3. 添加 `rel="noopener noreferrer"` 安全属性
```jsx
<PixelCard
  component="a"
  href={project.url}
  target="_blank"
  rel="noopener noreferrer"
  sx={{
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    '&:hover': {
      borderColor: 'accent.blue',
    },
  }}
>
```
4. 验证点击项目能打开 GitHub 仓库

---

## P1 优先级：样式与配色修复

### Task 6: 修复 ContentTabs Tab 按钮配色

**Design Direction** (@frontend-design skill):
- Tab 切换是核心导航元素，必须清晰醒目
- 使用高对比度配色：选中深色背景 + 蓝色边框
- 未选中状态使用暗灰色，不干扰视觉焦点
- TUI 风格：路径式标签 `~/articles`

**Files:**
- Modify: `frontend/src/components/ContentTabs.jsx`

**问题**: Tab 按钮配色与背景对比度不够，选中状态不清晰。

**当前问题代码**:
```jsx
color: isActive ? 'accent.blue' : 'text.secondary',
// text.secondary (#8b949e) 与背景 (#0d1117) 对比度不够
```

**修复步骤**:

1. 修改 `TabButton` 的 `sx` 样式
2. 未选中状态使用更亮的文字：`'text.primary'` (`#f0f6fc`)
3. 选中状态添加背景高亮：`bgcolor: 'rgba(88, 166, 255, 0.1)'`
4. 添加边框高亮：`border: 1, borderColor: isActive ? 'accent.blue' : 'transparent'`
5. 调整 padding 使按钮更醒目：`px: 2, py: 1`

**目标样式** (@frontend-design):
```jsx
sx={{
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  // 选中态：高亮背景 + 蓝色边框
  bgcolor: isActive ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
  color: isActive ? 'accent.blue' : 'text.primary',
  fontWeight: isActive ? 'bold' : 'normal',
  px: 2,
  py: 1,
  border: 1,
  borderColor: isActive ? 'accent.blue' : 'border.muted',
  borderBottom: 'none',
  transition: 'all 0.15s ease',
  '&:hover': {
    bgcolor: isActive ? 'rgba(88, 166, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
  },
}}
```

**Design Notes** (@frontend-design):
- 保持 TUI 风格的路径标签：`~/articles $`
- 选中使用 `▸` 前缀，未选中使用 `○`
- 右侧的 `$ ./` 强调终端感

**验证**: Tab 切换按钮应该清晰可见，选中状态有明显的蓝色高亮和边框。

---

### Task 7: 修复 Section 分割线样式

**Design Direction** (@frontend-design skill):
- 使用 CSS 布局而非手动字符实现分割
- Box Drawing 字符 `─` 用于标题前缀
- 分割线使用 `flex: 1` + `::after` 伪元素自适应宽度

**Files:**
- Modify: `frontend/src/components/sidebar/SocialLinks.jsx`
- Modify: `frontend/src/components/sidebar/Education.jsx`
- Modify: `frontend/src/components/sidebar/TechStack.jsx`
- Modify: `frontend/src/components/sidebar/GitHubActivity.jsx`

**问题**: Section 标题使用手动 `-` 字符生成分割线，无法响应式调整。

**正确模式** (@frontend-design):
```jsx
function SectionTitle({ children }) {
  return (
    <Box
      component="div"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'text.muted',
        fontSize: '0.75rem',
        mb: 1.5,
        '&::after': {
          content: '""',
          flex: 1,
          height: 1,
          bgcolor: 'border.muted',
          ml: 1,
        }
      }}
    >
      ──[ {children} ]
    </Box>
  );
}
```

**修复步骤**:

1. 修改 `SocialLinks.jsx` 的 `SectionTitle`
2. 修改 `Education.jsx` 的 `SectionTitle`
3. 修改 `TechStack.jsx` 的 `SectionTitle`
4. 修改 `GitHubActivity.jsx` 的 `SectionTitle`
5. 移除所有手动添加的 `-` 字符填充
6. 验证分割线自适应容器宽度

**Design Notes** (@frontend-design):
- 使用 JetBrains Mono 等宽字体保证 `─` 字符对齐
- 分割线颜色使用 `border.muted`
- 标题和分割线之间保持适当间距

**验证**: 分割线应该自适应容器宽度，不再有参差不齐的 `-` 字符。

---

### Task 8: 修复 GitHubActivity 颜色变量

**Design Direction** (@frontend-design skill):
- GitHub 活动日历使用 GitHub 官方配色
- 与整体 Terminal Aesthetics 协调
- 无活动时使用背景色，有活动时使用绿色系

**Files:**
- Modify: `frontend/src/components/sidebar/GitHubActivity.jsx`

**问题**: 颜色变量可能与设计系统不协调。

**当前代码分析**:
```jsx
const LEVELS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
// 这些是 GitHub 官方配色，与 Terminal Aesthetics 协调
```

**修复步骤**:

1. 确认现有颜色与设计系统协调（可选调整）
2. 如需调整为 CSS 变量：
```jsx
const LEVELS = [
  'var(--bg-tertiary)',     // #21262d 无活动
  '#0e4429',                // 低活动
  '#006d32',                // 中低活动
  '#26a641',                // 中高活动
  'var(--accent-green)',    // 高活动 #3fb950
];
```
3. 验证 GitHub 活动日历正常显示

**Design Notes** (@frontend-design):
- GitHub 官方绿 (`#39d353`) 比设计系统的 `accent-green` (`#3fb950`) 更亮
- 可保持 GitHub 官方配色以增强真实感

---

## P2 优先级：间距与布局优化

### Task 9: 统一组件间距系统

**Design Direction** (@frontend-design skill):
- 使用 8px 基础网格系统
- 组件间距使用 `spacing` token（如有）或 8 的倍数
- 保持 Terminal Aesthetics 的方正感（无圆角）

**Files:**
- Modify: `frontend/src/components/layout/MainLayout.jsx`
- Modify: `frontend/src/components/ContentTabs.jsx`
- Modify: `frontend/src/components/ArticleList.jsx`
- Modify: `frontend/src/components/ProjectList.jsx`

**建议间距系统** (@frontend-design):

| 元素 | 间距 | 说明 |
|------|------|------|
| Sidebar 内区块间距 | `mb: 2.5` (20px) | 各区块之间 |
| 主内容区内边距 | `p: 3` (24px) | 内容区整体 |
| Tab 与内容间距 | `mt: 3` (24px) | Tab 下方 |
| 文章列表项间距 | `gap: 1.5` (12px) | 列表项之间 |
| 项目卡片间距 | `gap: 2` (16px) | 网格间隙 |
| Section 内间距 | `py: 1.5` (12px) | 区块内部 |

**修复步骤**:

1. 检查并统一 `MainLayout` 的 padding
2. 检查并统一 `ContentTabs` 的 margin/padding
3. 检查并统一 `ArticleList` 的间距
4. 检查并统一 `ProjectList` 的间距
5. 检查并统一各 Sidebar 辅助组件的间距

**注意**: 不要过度工程化，只调整明显不合理的间距。

---

## P3 优先级：响应式布局完善

### Task 10: 完善移动端布局

**Design Direction** (@frontend-design skill):
- 移动端使用抽屉式侧边栏
- 保持 TUI 风格视觉语言
- 抽屉使用深色背景覆盖层

**Files:**
- Modify: `frontend/src/components/layout/MainLayout.jsx`

**问题**: 移动端侧边栏直接隐藏，未提供替代导航。

**修复步骤**:

1. 在 `MainLayout` 中为移动端添加顶部导航栏
2. 顶部导航栏包含：网站标题、菜单按钮（打开侧边栏抽屉）
3. 使用 MUI `Drawer` 组件实现侧边栏抽屉：
```jsx
import { Drawer, IconButton, Typography } from '@mui/material';
import { Menu as MenuIcon } from 'lucide-react';
import { useState } from 'react';

const [mobileOpen, setMobileOpen] = useState(false);

const handleDrawerToggle = () => {
  setMobileOpen(!mobileOpen);
};

return (
  <Box sx={{ display: 'flex' }}>
    {/* 移动端顶部导航栏 */}
    <Box
      component="nav"
      sx={{
        display: { xs: 'flex', sm: 'none' },
        alignItems: 'center',
        gap: 2,
        width: '100%',
        height: 56,
        px: 2,
        bgcolor: 'bg.secondary',
        borderBottom: 1,
        borderColor: 'border.default',
      }}
    >
      <IconButton onClick={handleDrawerToggle} sx={{ color: 'text.primary' }}>
        <MenuIcon size={20} />
      </IconButton>
      <Typography
        sx={{
          fontFamily: 'JetBrains Mono, monospace',
          color: 'text.primary',
        }}
      >
        ~/handywote
      </Typography>
    </Box>

    {/* 移动端侧边栏抽屉 */}
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={handleDrawerToggle}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: 'block', sm: 'none' },
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          bgcolor: 'bg.primary',
          borderRight: 1,
          borderColor: 'border.default',
        },
      }}
    >
      <Sidebar />
    </Drawer>

    {/* 桌面端固定侧边栏 */}
    <Box
      component="aside"
      sx={{
        display: { xs: 'none', sm: 'block' },
        width: sidebarWidth,
        flexShrink: 0,
        position: 'fixed',
        height: '100vh',
        overflow: 'auto',
      }}
    >
      <Sidebar />
    </Box>

    {/* 主内容区 */}
    <Box
      component="main"
      sx={{
        ml: { xs: 0, sm: `${sidebarWidth}px` },
        flex: 1,
        minHeight: '100vh',
        width: { xs: '100%', sm: `calc(100% - ${sidebarWidth}px)` },
      }}
    >
      <ContentTabs />
    </Box>
  </Box>
);
```

4. 验证移动端布局正确显示

**Design Notes** (@frontend-design):
- 顶部导航栏使用 `~/handywote` 路径风格
- 抽屉与桌面侧边栏使用相同的 Sidebar 组件
- 保持深色背景和边框风格

---

## 验证与测试

### Task 11: 本地验证

**Design Direction** (@frontend-design skill):
- 验证所有视觉效果符合 TUI 风格
- 确认交互反馈清晰
- 检查响应式布局在不同断点正确工作

**Step 1: 启动开发服务器**

```bash
cd /home/handy/MyWebsite/frontend && npm run dev
```

**Step 2: 验证清单**

- [ ] 侧边栏头像、名字、slogan 从后端正确获取显示
- [ ] 文章列表显示真实文章数据
- [ ] 点击文章能跳转到详情页 `/articles/:id`
- [ ] 项目列表显示真实 GitHub 项目
- [ ] 点击项目能打开 GitHub 仓库（新标签页）
- [ ] Tab 切换按钮配色清晰，选中状态明显
- [ ] Section 分割线使用 CSS 自适应宽度
- [ ] GitHub 活动日历正常显示
- [ ] 各部分间距协调统一
- [ ] 移动端布局正常（侧边栏抽屉）
- [ ] 无 console.error 或 API 错误

**Step 3: 运行 lint**

```bash
cd /home/handy/MyWebsite/frontend && npm run lint
```

---

## 实施顺序

1. Task 0: 分析现有代码结构
2. **Task 1: 修复 Sidebar.jsx 数据获取** (P0)
3. **Task 2: 修复 ArticleList.jsx 数据获取** (P0)
4. **Task 3: 修复 ArticleList 跳转详情** (P0, 依赖 Task 2)
5. **Task 4: 修复 ProjectList.jsx GitHub API** (P0)
6. **Task 5: 修复 ProjectList 跳转链接** (P0, 依赖 Task 4)
7. **Task 6: 修复 ContentTabs Tab 按钮配色** (P1)
8. **Task 7: 修复 Section 分割线样式** (P1)
9. **Task 8: 修复 GitHubActivity 颜色变量** (P1)
10. Task 9: 统一组件间距系统 (P2)
11. Task 10: 完善移动端布局 (P3)
12. Task 11: 本地验证

---

## 附录：关键代码参考

### API 端点参考 (from api.js)

```javascript
// 公开端点
siteBlocks: () => `${BASE_URL}/api/site-blocks`
articles: () => `${BASE_URL}/api/articles`
articleDetail: (id) => `${BASE_URL}/api/articles/${id}`

// GitHub API
githubRepos: 'https://api.github.com/users/{username}/repos'
```

### 响应解包参考

```javascript
import { unwrapApiPayload } from './config/api';

// 使用
const res = await fetch(url);
const data = await res.json();
const payload = unwrapApiPayload(data);
// payload 可能是 { articles: [...] } 或直接是 [...]
```

### 错误处理参考

```javascript
import { errorHandler, handleError } from './utils/errorHandler';

try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // ...
} catch (error) {
  handleError(error, 'ArticleList.fetchArticles');
}
```

### Terminal Aesthetics 配色参考 (@frontend-design)

```css
--bg-primary: #0d1117;
--bg-secondary: #161b22;
--bg-tertiary: #21262d;
--accent-blue: #58a6ff;
--accent-green: #3fb950;
--text-primary: #f0f6fc;
--text-secondary: #8b949e;
--text-muted: #484f58;
--border-default: #30363d;
--border-muted: #21262d;
```

### TUI 风格 Box Drawing 字符

| 用途 | 字符 |
|------|------|
| 边框角 | `┌` `┐` `└` `┘` |
| 边框线 | `─` `│` |
| 分隔线 | `──` |
| 链接前缀 | `▸` |
| 选中指示 | `●` `○` |
| 终端提示符 | `$` |
| 光标 | `▮` |
| GitHub 日历 | `█` `▁` |
