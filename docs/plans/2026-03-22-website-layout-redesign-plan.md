# 网站前台布局重新设计实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将前台首页改造为侧边栏固定 + Tab 切换的 TUI 风格布局，集成关于我、文章、项目三大板块。

**Architecture:**
- 复用现有 `pixel/` 设计系统组件
- 新增 `MainLayout` 布局组件，包含固定侧边栏和主内容区
- 新增 `Sidebar` 组件，整合关于我信息
- 新增 `ContentTabs` 组件，实现文章/项目 Tab 切换
- 新增 `ArticleList` 和 `ProjectCard` 组件，适配 TUI 风格
- 保持 React Router 的路由组织方式

**Tech Stack:** React 19, MUI 6, Framer Motion 12, React Router 7, Lucide React

---

## 前置任务

### Task 0: 了解现有代码结构

**Files:**
- Read: `frontend/src/App.jsx`
- Read: `frontend/src/components/Home.jsx`
- Read: `frontend/src/components/pixel/index.jsx`
- Read: `frontend/src/components/pixel/layout/PixelSidebar.jsx`

**Step 1: 阅读 App.jsx 了解路由结构**

```bash
cat frontend/src/App.jsx
```

**Step 2: 阅读 Home.jsx 了解当前首页实现**

```bash
cat frontend/src/components/Home.jsx
```

**Step 3: 阅读 PixelSidebar.jsx 了解现有侧边栏组件**

```bash
cat frontend/src/components/pixel/layout/PixelSidebar.jsx
```

---

## 阶段一：布局组件

### Task 1: 创建 MainLayout 主布局组件

**Files:**
- Create: `frontend/src/components/layout/MainLayout.jsx`

**Step 1: 创建 MainLayout 组件基础结构**

```jsx
import { Box } from '@mui/material';
import Sidebar from '../Sidebar';
import ContentTabs from '../ContentTabs';

const SIDEBAR_WIDTH = 280;

function MainLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 固定侧边栏 */}
      <Box
        component="aside"
        sx={{
          width: SIDEBAR_WIDTH,
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
          ml: `${SIDEBAR_WIDTH}px`,
          flex: 1,
          minHeight: '100vh',
        }}
      >
        <ContentTabs />
      </Box>
    </Box>
  );
}

export default MainLayout;
```

**Step 2: 运行 lint 验证代码**

```bash
cd frontend && npm run lint
```

Expected: No errors

---

### Task 2: 创建 Sidebar 组件结构

**Files:**
- Create: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/components/pixel/index.jsx` (导出 Sidebar)

**Step 1: 创建 Sidebar 组件**

```jsx
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import PixelAvatar from './pixel/ui/PixelAvatar';
import PixelChip from './pixel/ui/PixelChip';
import PixelContainer from './pixel/layout/PixelContainer';

const sidebarVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 100 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

function Sidebar() {
  return (
    <PixelContainer>
      <motion.div
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 头像 + 名字区域 */}
        <motion.div variants={itemVariants}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <PixelAvatar
              src="/avatar.jpg"
              alt="avatar"
              sx={{ width: 64, height: 64 }}
            />
            <Box>
              <Typography
                component="div"
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'text.primary',
                  fontWeight: 'bold',
                }}
              >
                name@host
              </Typography>
              <Typography
                component="div"
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                }}
              >
                $ slogan text
                <Box
                  component="span"
                  className="cursor-blink"
                  sx={{
                    display: 'inline-block',
                    width: 8,
                    height: 16,
                    bgcolor: 'accent.blue',
                    ml: 0.5,
                  }}
                />
              </Typography>
            </Box>
          </Box>
        </motion.div>

        {/* Social 区域 */}
        <motion.div variants={itemVariants}>
          <SocialLinks />
        </motion.div>

        {/* Education 区域 */}
        <motion.div variants={itemVariants}>
          <Education />
        </motion.div>

        {/* Tech Stack 区域 */}
        <motion.div variants={itemVariants}>
          <TechStack />
        </motion.div>

        {/* GitHub Activity 区域 */}
        <motion.div variants={itemVariants}>
          <GitHubActivity />
        </motion.div>
      </motion.div>
    </PixelContainer>
  );
}

export default Sidebar;
```

**Step 2: 更新 pixel/index.jsx 导出**

```jsx
// 添加导出
export { default as Sidebar } from '../Sidebar';
```

---

### Task 3: 创建 ContentTabs 组件

**Files:**
- Create: `frontend/src/components/ContentTabs.jsx`

**Step 1: 创建 ContentTabs 组件**

```jsx
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import ArticleList from './ArticleList';
import ProjectList from './ProjectList';

const TABS = [
  { id: 'articles', label: '~/articles', path: 'articles' },
  { id: 'projects', label: '~/projects', path: 'projects' },
];

function ContentTabs() {
  const [activeTab, setActiveTab] = useState('articles');

  return (
    <Box sx={{ p: 3 }}>
      {/* Tab 切换栏 */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mb: 4,
          borderBottom: 1,
          borderColor: 'border.default',
          pb: 1,
        }}
      >
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </Box>

      {/* 内容区域 */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'articles' ? <ArticleList /> : <ProjectList />}
      </motion.div>
    </Box>
  );
}

function TabButton({ tab, isActive, onClick }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: isActive ? 'accent.blue' : 'text.secondary',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '1rem',
        '&:hover': { color: 'text.primary' },
      }}
    >
      <Box component="span" sx={{ color: 'text.muted' }}>
        {isActive ? '▸' : '○'}
      </Box>
      <Typography
        component="span"
        sx={{
          fontFamily: 'inherit',
          color: 'inherit',
        }}
      >
        {tab.label}
      </Typography>
      {isActive && (
        <Box
          component="span"
          sx={{
            color: 'accent.blue',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {' '}$./
        </Box>
      )}
    </Box>
  );
}

export default ContentTabs;
```

---

## 阶段二：内容展示组件

### Task 4: 创建 ArticleList 组件

**Files:**
- Create: `frontend/src/components/ArticleList.jsx`

**Step 1: 创建 ArticleList 组件**

```jsx
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import PixelCard from './pixel/ui/PixelCard';

const ARTICLES = [
  {
    id: 1,
    date: 'Mar 15',
    title: '构建高性能Web服务的10个心得',
    category: '性能优化',
    readTime: '5 min read',
  },
  {
    id: 2,
    date: 'Mar 10',
    title: '从零理解Go并发模型',
    category: 'Go',
    readTime: '8 min read',
  },
  {
    id: 3,
    date: 'Mar 05',
    title: 'React Server Components 深入理解',
    category: 'React',
    readTime: '12 min read',
  },
];

function ArticleList() {
  return (
    <Box>
      {/* 终端头部 */}
      <Box sx={{ mb: 3 }}>
        <Typography
          component="div"
          sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.secondary' }}
        >
          $ ls -la ./articles/
        </Typography>
        <Typography
          component="div"
          sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'accent.green', mb: 2 }}
        >
          found {ARTICLES.length} articles
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'border.muted' }} />
      </Box>

      {/* 文章列表 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {ARTICLES.map((article, index) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 100 }}
          >
            <ArticleItem article={article} />
          </motion.div>
        ))}
      </Box>
    </Box>
  );
}

function ArticleItem({ article }) {
  return (
    <PixelCard
      sx={{
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: 'accent.blue',
          transform: 'translateX(4px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Typography
          component="span"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: 'text.muted',
            fontSize: '0.875rem',
            minWidth: 60,
          }}
        >
          {article.date}
        </Typography>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box component="span" sx={{ color: 'accent.blue' }}>
              ▸
            </Box>
            <Typography
              component="h3"
              sx={{
                fontFamily: 'JetBrains Mono, monospace',
                color: 'text.primary',
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              {article.title}
            </Typography>
          </Box>
          <Typography
            component="div"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.muted',
              fontSize: '0.75rem',
              pl: 3,
            }}
          >
            {article.category} · {article.readTime}
          </Typography>
        </Box>
      </Box>
    </PixelCard>
  );
}

export default ArticleList;
```

---

### Task 5: 创建 ProjectList 组件

**Files:**
- Create: `frontend/src/components/ProjectList.jsx`

**Step 1: 创建 ProjectList 组件**

```jsx
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import PixelCard from './pixel/ui/PixelCard';
import PixelChip from './pixel/ui/PixelChip';

const PROJECTS = [
  {
    id: 1,
    name: 'my-project',
    description: 'A powerful CLI tool for automating development workflows',
    tags: ['Go', 'CLI', 'DevOps'],
    stars: 234,
    forks: 45,
    updatedAt: '2d ago',
  },
  {
    id: 2,
    name: 'dotfiles',
    description: 'My personal dotfiles and development environment setup',
    tags: ['Shell', 'Linux'],
    stars: 89,
    forks: 12,
    updatedAt: '1w ago',
  },
  {
    id: 3,
    name: 'blog',
    description: 'A minimalist blog built with React and Markdown',
    tags: ['React', 'TypeScript'],
    stars: 156,
    forks: 23,
    updatedAt: '3d ago',
  },
];

function ProjectList() {
  return (
    <Box>
      {/* 终端头部 */}
      <Box sx={{ mb: 3 }}>
        <Typography
          component="div"
          sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.secondary' }}
        >
          $ ls -la ./projects/
        </Typography>
        <Typography
          component="div"
          sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'accent.green', mb: 2 }}
        >
          found {PROJECTS.length} repositories
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'border.muted' }} />
      </Box>

      {/* 项目网格 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 2,
        }}
      >
        {PROJECTS.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 100 }}
          >
            <ProjectCard project={project} />
          </motion.div>
        ))}
      </Box>
    </Box>
  );
}

function ProjectCard({ project }) {
  return (
    <PixelCard
      sx={{
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: 'accent.blue',
        },
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box component="span" sx={{ color: 'accent.blue' }}>
            ▸
          </Box>
          <Typography
            component="h3"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.primary',
              fontWeight: 'bold',
            }}
          >
            {project.name}
          </Typography>
        </Box>
        <Box sx={{ borderBottom: 1, borderColor: 'border.muted', mb: 2 }} />
        <Typography
          component="p"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: 'text.secondary',
            fontSize: '0.875rem',
            mb: 2,
          }}
        >
          {project.description}
        </Typography>
      </Box>

      {/* 标签 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {project.tags.map((tag) => (
          <PixelChip key={tag} label={tag} size="small" />
        ))}
      </Box>

      {/* 统计信息 */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" sx={{ color: 'accent.yellow' }}>
            ★
          </Box>
          <Typography
            component="span"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          >
            {project.stars}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" sx={{ color: 'text.muted' }}>
            ⑂
          </Box>
          <Typography
            component="span"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          >
            {project.forks}
          </Typography>
        </Box>
        <Typography
          component="span"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: 'text.muted',
            fontSize: '0.75rem',
            ml: 'auto',
          }}
        >
          updated {project.updatedAt}
        </Typography>
      </Box>
    </PixelCard>
  );
}

export default ProjectList;
```

---

## 阶段三：辅助组件

### Task 6: 创建 SocialLinks 组件

**Files:**
- Create: `frontend/src/components/sidebar/SocialLinks.jsx`
- Modify: `frontend/src/components/Sidebar.jsx` (导入使用)

**Step 1: 创建 SocialLinks 组件**

```jsx
import { Box, Typography } from '@mui/material';
import { Github, Mail } from 'lucide-react';

const SOCIALS = [
  { icon: Github, label: 'GitHub', href: 'https://github.com/username' },
  { icon: Mail, label: 'Email', href: 'mailto:hello@example.com' },
];

function SocialLinks() {
  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Social</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {SOCIALS.map((social) => (
          <Box
            component="a"
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.875rem',
              transition: 'color 0.15s ease',
              '&:hover': {
                color: 'accent.blue',
              },
              '&:hover::before': {
                content: '"▸ "',
                color: 'accent.blue',
              },
            }}
          >
            <social.icon size={14} />
            {social.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography
      component="div"
      sx={{
        fontFamily: 'JetBrains Mono, monospace',
        color: 'text.muted',
        fontSize: '0.75rem',
        mb: 1,
        pb: 0.5,
        borderBottom: 1,
        borderColor: 'border.muted',
      }}
    >
      ──[ {children} ]─────────────────────
    </Typography>
  );
}

export default SocialLinks;
```

---

### Task 7: 创建 Education、TechStack、GitHubActivity 组件

**Files:**
- Create: `frontend/src/components/sidebar/Education.jsx`
- Create: `frontend/src/components/sidebar/TechStack.jsx`
- Create: `frontend/src/components/sidebar/GitHubActivity.jsx`

**Step 1: 创建 Education 组件**

```jsx
import { Box, Typography } from '@mui/material';

const EDUCATION = [
  { school: '北京大学', period: '2022-2026' },
];

function Education() {
  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Education</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {EDUCATION.map((edu) => (
          <Box
            key={edu.school}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.875rem',
              color: 'text.secondary',
              '&::before': { content: '"▸ "', color: 'accent.green' },
            }}
          >
            {edu.school} ({edu.period})
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography
      component="div"
      sx={{
        fontFamily: 'JetBrains Mono, monospace',
        color: 'text.muted',
        fontSize: '0.75rem',
        mb: 1,
        pb: 0.5,
        borderBottom: 1,
        borderColor: 'border.muted',
      }}
    >
      ──[ {children} ]─────────────────────
    </Typography>
  );
}

export default Education;
```

**Step 2: 创建 TechStack 组件**

```jsx
import { Box } from '@mui/material';
import PixelChip from '../pixel/ui/PixelChip';

const TECH_STACK = ['React', 'Go', 'TypeScript', 'Node.js', 'PostgreSQL'];

function TechStack() {
  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Tech Stack</SectionTitle>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {TECH_STACK.map((tech) => (
          <PixelChip key={tech} label={tech} size="small" />
        ))}
      </Box>
    </Box>
  );
}

function SectionTitle({ children }) {
  return (
    <Box
      component="div"
      sx={{
        fontFamily: 'JetBrains Mono, monospace',
        color: 'text.muted',
        fontSize: '0.75rem',
        mb: 1,
        pb: 0.5,
        borderBottom: 1,
        borderColor: 'border.muted',
      }}
    >
      ──[ {children} ]─────────────────────
    </Box>
  );
}

export default TechStack;
```

**Step 3: 创建 GitHubActivity 组件**

```jsx
import { Box } from '@mui/material';

const ACTIVITY_DATA = [
  [4, 3, 4, 2, 1, 3, 4],
  [2, 4, 1, 3, 4, 2, 3],
  [1, 2, 3, 4, 1, 2, 4],
  [3, 1, 4, 2, 3, 4, 1],
];

const LEVELS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

function GitHubActivity() {
  return (
    <Box>
      <SectionTitle>GitHub Activity</SectionTitle>
      <Box
        sx={{
          display: 'flex',
          gap: '2px',
          flexWrap: 'wrap',
          maxWidth: 200,
        }}
      >
        {ACTIVITY_DATA.flat().map((level, i) => (
          <Box
            key={i}
            sx={{
              width: 12,
              height: 12,
              bgcolor: LEVELS[level],
              borderRadius: 0,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

function SectionTitle({ children }) {
  return (
    <Box
      component="div"
      sx={{
        fontFamily: 'JetBrains Mono, monospace',
        color: 'text.muted',
        fontSize: '0.75rem',
        mb: 1,
        pb: 0.5,
        borderBottom: 1,
        borderColor: 'border.muted',
      }}
    >
      ──[ {children} ]─────────────
    </Box>
  );
}

export default GitHubActivity;
```

---

## 阶段四：样式与动画

### Task 8: 添加全局样式

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/pixel/tokens.js`

**Step 1: 添加光标闪烁和链接悬停样式**

```css
/* 光标闪烁 */
.cursor-blink {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 链接悬停效果 */
.tui-link:hover::before {
  content: '▸ ';
  color: var(--accent-blue);
}
```

**Step 2: 在 tokens.js 中添加 missing 颜色变量**

```javascript
// 在 colors.accent 中添加
yellow: '#e3b341',
```

---

## 阶段五：集成与路由

### Task 9: 更新路由配置

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: 将 Home 替换为 MainLayout**

```jsx
// 修改前
<Route path="/*" element={<AppContent />} />

// AppContent 内部
<Route path="/" element={<Home />} />
<Route path="/articles" element={<Articles />} />
<Route path="/articles/:id" element={<ArticleDetail />} />

// 修改后
<Route path="/*" element={<MainLayout />}>
  <Route index element={<ArticleList />} />
  <Route path="articles" element={<ArticleList />} />
  <Route path="articles/:id" element={<ArticleDetail />} />
  <Route path="projects" element={<ProjectList />} />
</Route>
```

---

### Task 10: 响应式适配

**Files:**
- Modify: `frontend/src/components/layout/MainLayout.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

**Step 1: 添加响应式断点逻辑**

```jsx
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const sidebarWidth = isMobile ? 0 : isTablet ? 200 : 280;

  if (isMobile) {
    return (
      <Box>
        {/* 移动端：顶部导航 + 完整内容 */}
        <MobileLayout />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="aside"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          position: 'fixed',
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <Sidebar />
      </Box>
      <Box
        component="main"
        sx={{
          ml: `${sidebarWidth}px`,
          flex: 1,
          minHeight: '100vh',
        }}
      >
        <ContentTabs />
      </Box>
    </Box>
  );
}
```

---

## 验证与测试

### Task 11: 本地验证

**Step 1: 启动开发服务器**

```bash
cd frontend && npm run dev
```

**Step 2: 验证清单**

- [ ] 侧边栏正确显示（固定位置，280px 宽度）
- [ ] Tab 切换正常工作
- [ ] 文章列表 TUI 风格显示
- [ ] 项目卡片 TUI 风格显示
- [ ] 响应式布局（< 768px 移动端）
- [ ] 动画效果正常（staggered reveal, cursor blink）

**Step 3: 运行 lint**

```bash
cd frontend && npm run lint
```

---

## 实施顺序

1. Task 0: 了解现有代码结构
2. Task 1: 创建 MainLayout 主布局组件
3. Task 2: 创建 Sidebar 组件结构
4. Task 3: 创建 ContentTabs 组件
5. Task 4: 创建 ArticleList 组件
6. Task 5: 创建 ProjectList 组件
7. Task 6: 创建 SocialLinks 组件
8. Task 7: 创建辅助组件（Education, TechStack, GitHubActivity）
9. Task 8: 添加全局样式
10. Task 9: 更新路由配置
11. Task 10: 响应式适配
12. Task 11: 本地验证
