# Terminal Aesthetics 前端重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将前端重构为 Terminal Aesthetics 风格，建立像素风格组件库并替换全部前台和 Admin 页面。

**Architecture:** 采用 MUI Theme Provider 扩展 + 独立像素组件库，设计令牌驱动，实现完全的组件化和模块化。

**Tech Stack:** React 19, MUI 6, Framer Motion, JetBrains Mono, Lucide React

---

## Phase 1: 基础设施

### Task 1: 创建设计令牌 tokens.js

**Files:**
- Create: `frontend/src/components/pixel/tokens.js`

**Step 1: 创建目录结构**

```bash
mkdir -p frontend/src/components/pixel/{base,ui,layout}
```

**Step 2: 创建 tokens.js**

```javascript
// frontend/src/components/pixel/tokens.js

// 色彩系统
export const colors = {
  // 背景色
  bg: {
    primary: '#0d1117',
    secondary: '#161b22',
    tertiary: '#21262d',
  },
  // 强调色
  accent: {
    blue: '#58a6ff',
    green: '#3fb950',
    purple: '#a371f7',
    red: '#f85149',
  },
  // 文字色 - 白蓝黑比例 6:3:1
  text: {
    primary: '#f0f6fc',    // 白色 60%
    secondary: '#8b949e',  // 蓝色系 30%
    muted: '#484f58',      // 黑色系 10%
  },
  // 边框
  border: {
    default: '#30363d',
    muted: '#21262d',
    accent: '#58a6ff',
  },
  // 交互状态
  interactive: {
    hover: '#1f2428',
    active: '#2d333b',
  },
};

// 间距系统
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

// 字体系统
export const typography = {
  fontFamily: {
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    sans: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    xxl: '2rem',
    xxxl: '3rem',
  },
};

// 边框系统 - 像素风格方正边框
export const borders = {
  default: '1px dashed',
  solid: '1px solid',
  emphasis: '2px solid',
  radius: '0',  // 方正像素感
};

// 阴影 - 像素风格不使用阴影
export const shadows = {
  none: 'none',
};

// 动画
export const animations = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
};

// 导出完整主题对象
export const pixelTheme = {
  colors,
  spacing,
  typography,
  borders,
  shadows,
  animations,
};

export default pixelTheme;
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/tokens.js
git commit -m "feat(pixel): add design tokens for Terminal Aesthetics"
```

---

### Task 2: 创建 PixelProvider.jsx

**Files:**
- Create: `frontend/src/components/pixel/PixelProvider.jsx`

**Step 1: 创建 PixelProvider.jsx**

```javascript
// frontend/src/components/pixel/PixelProvider.jsx
import { createTheme, ThemeProvider } from '@mui/material';
import { colors, typography, spacing, borders, shadows, animations } from './tokens';

/**
 * PixelProvider - MUI 主题提供者，集成 Terminal Aesthetics 设计系统
 */
const pixelTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.accent.blue,
      light: colors.accent.blue,
      dark: '#1f6feb',
    },
    secondary: {
      main: colors.accent.green,
    },
    error: {
      main: colors.accent.red,
    },
    background: {
      default: colors.bg.primary,
      paper: colors.bg.secondary,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.muted,
    },
    divider: colors.border.default,
  },
  typography: {
    fontFamily: typography.fontFamily.sans,
    h1: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.xxxl,
      fontWeight: 700,
    },
    h2: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.xxl,
      fontWeight: 600,
    },
    h3: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.xl,
      fontWeight: 600,
    },
    h4: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.lg,
      fontWeight: 500,
    },
    h5: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.md,
      fontWeight: 500,
    },
    h6: {
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.sm,
      fontWeight: 500,
    },
    body1: {
      fontSize: typography.fontSize.md,
      lineHeight: 1.7,
    },
    body2: {
      fontSize: typography.fontSize.sm,
      lineHeight: 1.6,
    },
    button: {
      fontFamily: typography.fontFamily.mono,
      textTransform: 'none',
      fontWeight: 500,
    },
    caption: {
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
    },
  },
  shape: {
    borderRadius: 0,  // 像素风格方正边框
  },
  spacing: spacing,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.bg.primary,
          color: colors.text.primary,
          scrollBehavior: 'smooth',
        },
        '::selection': {
          backgroundColor: colors.accent.blue,
          color: colors.bg.primary,
        },
        '::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '::-webkit-scrollbar-track': {
          background: colors.bg.secondary,
        },
        '::-webkit-scrollbar-thumb': {
          background: colors.border.default,
          '&:hover': {
            background: colors.text.muted,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          padding: `${spacing.sm} ${spacing.md}`,
          transition: animations.normal,
          fontFamily: typography.fontFamily.mono,
        },
        contained: {
          boxShadow: shadows.none,
          '&:hover': {
            boxShadow: shadows.none,
          },
        },
        outlined: {
          borderStyle: 'dashed',
          '&:hover': {
            borderStyle: 'solid',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `${borders.default} ${colors.border.default}`,
          backgroundColor: colors.bg.secondary,
          transition: animations.normal,
          '&:hover': {
            borderColor: colors.border.accent,
            borderStyle: 'solid',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: colors.bg.secondary,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            '& fieldset': {
              borderStyle: 'dashed',
            },
            '&:hover fieldset': {
              borderStyle: 'solid',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.xs,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          border: `${borders.solid} ${colors.border.default}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bg.secondary,
          borderBottom: `${borders.solid} ${colors.border.default}`,
          boxShadow: shadows.none,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.bg.tertiary,
          border: `${borders.solid} ${colors.border.default}`,
          borderRadius: 0,
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.xs,
        },
      },
    },
  },
});

export function PixelProvider({ children }) {
  return (
    <ThemeProvider theme={pixelTheme}>
      {children}
    </ThemeProvider>
  );
}

export default PixelProvider;
```

**Step 2: 创建 index.jsx 统一导出**

```javascript
// frontend/src/components/pixel/index.jsx
export { PixelProvider, default } from './PixelProvider';
export { default as pixelTheme, colors, spacing, typography, borders, shadows, animations } from './tokens';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/PixelProvider.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelProvider with MUI theme integration"
```

---

### Task 3: 添加 JetBrains Mono 字体到 index.html

**Files:**
- Modify: `frontend/index.html`

**Step 1: 在 index.html 添加 Google Fonts 链接**

在 `<head>` 中添加:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
```

**Step 2: 提交**

```bash
git add frontend/index.html
git commit -m "feat(pixel): add JetBrains Mono font"
```

---

### Task 4: 创建全局像素样式 index.css

**Files:**
- Modify: `frontend/src/index.css`

**Step 1: 替换 index.css 内容**

```css
/* Terminal Aesthetics 全局样式 */
:root {
  /* 色彩系统 */
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --accent-blue: #58a6ff;
  --accent-green: #3fb950;
  --accent-purple: #a371f7;
  --accent-red: #f85149;
  --text-primary: #f0f6fc;
  --text-secondary: #8b949e;
  --text-muted: #484f58;
  --border-default: #30363d;
  --border-muted: #21262d;

  /* 字体 */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 48px;

  /* 布局变量 */
  --section-padding-block: clamp(48px, 10vh, 96px);
  --section-padding-inline: clamp(16px, 7vw, 48px);
  --section-gap: clamp(24px, 4vh, 48px);
  --content-max-width: 960px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.7;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 点阵背景纹理 */
.pixel-grid-bg {
  background-image: radial-gradient(circle, var(--border-muted) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* 扫描线效果 */
.scanlines {
  position: relative;
}
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  pointer-events: none;
}

/* 光标闪烁动画 */
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.cursor-blink::after {
  content: '_';
  animation: blink 1s infinite;
  color: var(--accent-blue);
}

/* 滑入动画 */
@keyframes slideInLeft {
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.slide-in-left {
  animation: slideInLeft 0.3s ease forwards;
}

/* 终端卡片 */
.terminal-card {
  border: 1px dashed var(--border-default);
  background-color: var(--bg-secondary);
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.terminal-card:hover {
  border-color: var(--accent-blue);
  border-style: solid;
  transform: translateY(-2px);
}

/* 终端标题栏 */
.terminal-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-default);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.terminal-header::before {
  content: '▌';
  color: var(--accent-blue);
}

/* Section 样式 */
.section {
  width: 100%;
  min-height: 100vh;
  padding: var(--section-padding-block) var(--section-padding-inline);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--section-gap);
}

/* Container */
.container {
  width: min(100%, var(--content-max-width));
  margin: 0 auto;
  padding: 0 var(--section-padding-inline);
}

/* 链接样式 */
a {
  color: var(--accent-blue);
  text-decoration: none;
  transition: color 0.15s ease;
}
a:hover {
  color: var(--accent-green);
}

/* 代码风格文本 */
.code-text {
  font-family: var(--font-mono);
}

/* 响应式 */
@media (max-width: 768px) {
  :root {
    --content-max-width: 720px;
    --section-gap: 24px;
  }
  .container {
    padding: 0 clamp(12px, 4vw, 24px);
  }
}
```

**Step 2: 提交**

```bash
git add frontend/src/index.css
git commit -m "feat(pixel): add Terminal Aesthetics global styles"
```

---

## Phase 2: 基础组件

### Task 5: 创建 PixelButton 组件

**Files:**
- Create: `frontend/src/components/pixel/ui/PixelButton.jsx`

**Step 1: 创建 PixelButton.jsx**

```javascript
// frontend/src/components/pixel/ui/PixelButton.jsx
import { Button as MuiButton } from '@mui/material';
import { colors, typography, spacing, animations } from '../tokens';

/**
 * PixelButton - 终端风格按钮组件
 *
 * 变体:
 * - primary: 蓝色填充
 * - outline: 透明边框
 * - ghost: 无边框
 * - destructive: 红色填充
 */
export function PixelButton({
  children,
  variant = 'primary',
  prefix = null,
  suffix = null,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return {
          bgcolor: 'transparent',
          color: colors.accent.blue,
          border: `${colors.border.default}`,
          borderStyle: 'dashed',
          '&:hover': {
            bgcolor: 'transparent',
            borderStyle: 'solid',
            borderColor: colors.accent.blue,
          },
        };
      case 'ghost':
        return {
          bgcolor: 'transparent',
          color: colors.accent.blue,
          border: 'none',
          '&:hover': {
            bgcolor: colors.interactive.hover,
            border: 'none',
          },
        };
      case 'destructive':
        return {
          bgcolor: colors.accent.red,
          color: colors.text.primary,
          border: 'none',
          '&:hover': {
            bgcolor: '#da3633',
            border: 'none',
          },
        };
      case 'secondary':
        return {
          bgcolor: colors.accent.green,
          color: colors.bg.primary,
          border: 'none',
          '&:hover': {
            bgcolor: '#2ea043',
            border: 'none',
          },
        };
      case 'primary':
      default:
        return {
          bgcolor: colors.accent.blue,
          color: colors.bg.primary,
          border: 'none',
          '&:hover': {
            bgcolor: '#1f6feb',
            border: 'none',
          },
        };
    }
  };

  return (
    <MuiButton
      {...props}
      sx={{
        fontFamily: typography.fontFamily.mono,
        fontSize: typography.fontSize.sm,
        fontWeight: 500,
        borderRadius: 0,
        padding: `${spacing.sm} ${spacing.md}`,
        transition: animations.normal,
        textTransform: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        ...getVariantStyles(),
        ...props.sx,
      }}
    >
      {prefix && <span>{prefix}</span>}
      {children}
      {suffix && <span>{suffix}</span>}
    </MuiButton>
  );
}

export default PixelButton;
```

**Step 2: 更新 index.jsx 导出**

```javascript
// frontend/src/components/pixel/index.jsx
export { PixelProvider, default } from './PixelProvider';
export { default as pixelTheme, colors, spacing, typography, borders, shadows, animations } from './tokens';
export { PixelButton } from './ui/PixelButton';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/ui/PixelButton.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelButton component"
```

---

### Task 6: 创建 PixelCard 组件

**Files:**
- Create: `frontend/src/components/pixel/ui/PixelCard.jsx`

**Step 1: 创建 PixelCard.jsx**

```javascript
// frontend/src/components/pixel/ui/PixelCard.jsx
import { Card as MuiCard, CardContent, CardActions, Typography } from '@mui/material';
import { colors, typography, spacing, animations, borders } from '../tokens';

/**
 * PixelCard - 终端风格卡片组件
 *
 * 特点:
 * - 左侧蓝色竖线强调
 * - 虚线边框，hover 变实线
 * - 扁平化无阴影
 */
export function PixelCard({
  title,
  subtitle,
  children,
  footer,
  accentLine = true,
  ...props
}) {
  return (
    <MuiCard
      {...props}
      sx={{
        borderRadius: 0,
        border: `${borders.default} ${colors.border.default}`,
        backgroundColor: colors.bg.secondary,
        transition: animations.normal,
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          borderColor: colors.border.accent,
          borderStyle: 'solid',
          transform: 'translateY(-2px)',
        },
        // 左侧蓝色强调线
        '&::before': accentLine ? {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: colors.accent.blue,
        } : {},
        ...props.sx,
      }}
    >
      {(title || subtitle) && (
        <CardContent
          sx={{
            pb: accentLine ? spacing.md : spacing.sm,
            pl: accentLine ? `${spacing.lg} !important` : spacing.md,
            '&:last-child': { pb: spacing.md },
          }}
        >
          {title && (
            <Typography
              variant="h5"
              component="h3"
              sx={{
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize.lg,
                fontWeight: 600,
                color: colors.text.primary,
                mb: subtitle ? spacing.xs : 0,
              }}
            >
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                fontFamily: typography.fontFamily.mono,
                color: colors.text.secondary,
                fontSize: typography.fontSize.xs,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </CardContent>
      )}
      {children && (
        <CardContent
          sx={{
            pt: accentLine ? 0 : spacing.sm,
            pl: accentLine ? `${spacing.lg} !important` : spacing.md,
            '&:last-child': { pb: spacing.md },
          }}
        >
          {children}
        </CardContent>
      )}
      {footer && (
        <CardActions
          sx={{
            px: spacing.md,
            pb: spacing.md,
            pt: 0,
            borderTop: `1px dashed ${colors.border.muted}`,
            ml: accentLine ? `${spacing.lg} !important` : 0,
          }}
        >
          {footer}
        </CardActions>
      )}
    </MuiCard>
  );
}

export default PixelCard;
```

**Step 2: 更新 index.jsx 导出**

```javascript
export { PixelButton } from './ui/PixelButton';
export { PixelCard } from './ui/PixelCard';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/ui/PixelCard.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelCard component"
```

---

### Task 7: 创建 PixelChip 组件

**Files:**
- Create: `frontend/src/components/pixel/ui/PixelChip.jsx`

**Step 1: 创建 PixelChip.jsx**

```javascript
// frontend/src/components/pixel/ui/PixelChip.jsx
import { Chip as MuiChip } from '@mui/material';
import { colors, typography, spacing, animations } from '../tokens';

/**
 * PixelChip - 终端风格标签组件
 */
export function PixelChip({ label, variant = 'default', ...props }) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return {
          bgcolor: colors.accent.blue,
          color: colors.bg.primary,
          borderColor: colors.accent.blue,
        };
      case 'success':
        return {
          bgcolor: 'transparent',
          color: colors.accent.green,
          borderColor: colors.accent.green,
        };
      case 'warning':
        return {
          bgcolor: 'transparent',
          color: '#d29922',
          borderColor: '#d29922',
        };
      case 'error':
        return {
          bgcolor: 'transparent',
          color: colors.accent.red,
          borderColor: colors.accent.red,
        };
      case 'default':
      default:
        return {
          bgcolor: colors.bg.tertiary,
          color: colors.text.secondary,
          borderColor: colors.border.default,
        };
    }
  };

  return (
    <MuiChip
      label={label}
      size="small"
      {...props}
      sx={{
        fontFamily: typography.fontFamily.mono,
        fontSize: typography.fontSize.xs,
        fontWeight: 500,
        borderRadius: 0,
        height: '24px',
        border: `1px solid ${colors.border.default}`,
        transition: animations.fast,
        ...getVariantStyles(),
        ...props.sx,
      }}
    />
  );
}

export default PixelChip;
```

**Step 2: 更新 index.jsx 导出**

```javascript
export { PixelChip } from './ui/PixelChip';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/ui/PixelChip.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelChip component"
```

---

### Task 8: 创建 PixelAvatar 组件

**Files:**
- Create: `frontend/src/components/pixel/ui/PixelAvatar.jsx`

**Step 1: 创建 PixelAvatar.jsx**

```javascript
// frontend/src/components/pixel/ui/PixelAvatar.jsx
import { Avatar as MuiAvatar } from '@mui/material';
import { colors, spacing } from '../tokens';

/**
 * PixelAvatar - 终端风格头像组件
 *
 * 特点:
 * - 方形边框（无圆角或极小圆角）
 * - 可选像素边框装饰
 */
export function PixelAvatar({
  src,
  alt,
  size = 'medium',
  pixelBorder = true,
  ...props
}) {
  const sizeMap = {
    small: 32,
    medium: 48,
    large: 80,
    xlarge: 120,
  };

  const pixelSize = sizeMap[size] || sizeMap.medium;

  return (
    <MuiAvatar
      src={src}
      alt={alt}
      {...props}
      sx={{
        width: pixelSize,
        height: pixelSize,
        borderRadius: pixelBorder ? '2px' : '50%',
        border: pixelBorder ? `2px solid ${colors.border.default}` : 'none',
        transition: 'border-color 0.2s ease',
        '&:hover': pixelBorder ? {
          borderColor: colors.accent.blue,
        } : {},
        ...props.sx,
      }}
    />
  );
}

export default PixelAvatar;
```

**Step 2: 更新 index.jsx 导出**

```javascript
export { PixelAvatar } from './ui/PixelAvatar';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/ui/PixelAvatar.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelAvatar component"
```

---

### Task 9: 创建 PixelInput 组件

**Files:**
- Create: `frontend/src/components/pixel/ui/PixelInput.jsx`

**Step 1: 创建 PixelInput.jsx**

```javascript
// frontend/src/components/pixel/ui/PixelInput.jsx
import { TextField } from '@mui/material';
import { colors, typography, spacing, animations } from '../tokens';

/**
 * PixelInput - 终端风格输入框组件
 */
export function PixelInput({
  label,
  placeholder,
  prefix,
  suffix,
  ...props
}) {
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      {...props}
      sx={{
        '& .MuiOutlinedInput-root': {
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.sm,
          borderRadius: 0,
          bgcolor: colors.bg.tertiary,
          '& fieldset': {
            borderStyle: 'dashed',
            borderColor: colors.border.default,
            transition: animations.fast,
          },
          '&:hover fieldset': {
            borderStyle: 'solid',
            borderColor: colors.border.default,
          },
          '&.Mui-focused fieldset': {
            borderStyle: 'solid',
            borderColor: colors.accent.blue,
            borderWidth: '1px',
          },
        },
        '& .MuiInputLabel-root': {
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          '&.Mui-focused': {
            color: colors.accent.blue,
          },
        },
        '& .MuiOutlinedInput-input': {
          padding: `${spacing.sm} ${spacing.md}`,
        },
        ...props.sx,
      }}
    />
  );
}

export default PixelInput;
```

**Step 2: 更新 index.jsx 导出**

```javascript
export { PixelInput } from './ui/PixelInput';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/ui/PixelInput.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelInput component"
```

---

### Task 10: 创建 PixelTypography 组件

**Files:**
- Create: `frontend/src/components/pixel/ui/PixelTypography.jsx`

**Step 1: 创建 PixelTypography.jsx**

```javascript
// frontend/src/components/pixel/ui/PixelTypography.jsx
import { Typography } from '@mui/material';
import { colors, typography } from '../tokens';

/**
 * PixelTypography - 终端风格文本组件
 *
 * 提供预配置的终端风格文本样式
 */
export function PixelTypography({
  children,
  variant = 'body1',
  as,
  code = false,
  muted = false,
  accent = false,
  ...props
}) {
  const Component = as || Typography;

  const getColorStyle = () => {
    if (accent) return { color: colors.accent.blue };
    if (muted) return { color: colors.text.muted };
    return {};
  };

  return (
    <Component
      variant={variant}
      {...props}
      sx={{
        fontFamily: code ? typography.fontFamily.mono : 'inherit',
        ...getColorStyle(),
        ...props.sx,
      }}
    >
      {children}
    </Component>
  );
}

/**
 * CodeBlock - 代码风格文本块
 */
export function CodeBlock({ children, ...props }) {
  return (
    <PixelTypography
      component="pre"
      code={true}
      {...props}
      sx={{
        bgcolor: colors.bg.tertiary,
        p: 2,
        borderLeft: `3px solid ${colors.accent.blue}`,
        overflow: 'auto',
        fontSize: typography.fontSize.sm,
        ...props.sx,
      }}
    >
      {children}
    </PixelTypography>
  );
}

/**
 * TerminalLine - 终端命令行
 */
export function TerminalLine({ children, prompt = '>', ...props }) {
  return (
    <PixelTypography
      component="div"
      code={true}
      {...props}
      sx={{
        fontFamily: typography.fontFamily.mono,
        display: 'flex',
        gap: 1,
        '&::before': {
          content: `"${prompt}"`,
          color: colors.accent.green,
        },
        ...props.sx,
      }}
    >
      {children}
    </PixelTypography>
  );
}

export default PixelTypography;
```

**Step 2: 更新 index.jsx 导出**

```javascript
export { PixelTypography, CodeBlock, TerminalLine } from './ui/PixelTypography';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/ui/PixelTypography.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelTypography component"
```

---

## Phase 3: 布局组件

### Task 11: 创建 PixelContainer 组件

**Files:**
- Create: `frontend/src/components/pixel/layout/PixelContainer.jsx`

**Step 1: 创建 PixelContainer.jsx**

```javascript
// frontend/src/components/pixel/layout/PixelContainer.jsx
import { Box } from '@mui/material';

/**
 * PixelContainer - 终端风格响应式容器
 */
export function PixelContainer({
  children,
  maxWidth = 'md',
  section = false,
  ...props
}) {
  const maxWidthMap = {
    xs: '480px',
    sm: '640px',
    md: '800px',
    lg: '960px',
    xl: '1200px',
  };

  return (
    <Box
      component="section"
      {...props}
      sx={{
        width: '100%',
        minHeight: section ? '100vh' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: section ? 'center' : 'flex-start',
        padding: section
          ? 'clamp(48px, 10vh, 96px) clamp(16px, 7vw, 48px)'
          : 0,
        gap: 'clamp(24px, 4vh, 48px)',
        ...props.sx,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: maxWidthMap[maxWidth] || maxWidthMap.md,
          margin: '0 auto',
          padding: '0 clamp(16px, 7vw, 48px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default PixelContainer;
```

**Step 2: 更新 index.jsx 导出**

```javascript
export { PixelContainer } from './layout/PixelContainer';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/layout/PixelContainer.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelContainer layout component"
```

---

### Task 12: 创建 PixelNavbar 组件

**Files:**
- Create: `frontend/src/components/pixel/layout/PixelNavbar.jsx`

**Step 1: 创建 PixelNavbar.jsx**

```javascript
// frontend/src/components/pixel/layout/PixelNavbar.jsx
import { AppBar, Toolbar, Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { colors, typography, spacing } from '../tokens';

/**
 * PixelNavbar - 终端风格导航栏
 */
export function PixelNavbar({ title = 'HandyWote', routes = [] }) {
  const location = useLocation();

  const defaultRoutes = [
    { path: '/', label: 'Home' },
    { path: '/articles', label: 'Articles' },
    { path: '/projects', label: 'Projects' },
  ];

  const navRoutes = routes.length > 0 ? routes : defaultRoutes;

  return (
    <AppBar position="sticky">
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '56px !important',
          px: { xs: 2, sm: 4 },
        }}
      >
        {/* Logo */}
        <Box
          component={Link}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: colors.text.primary,
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.lg,
            fontWeight: 600,
            '&:hover': {
              color: colors.accent.blue,
            },
          }}
        >
          <Box
            component="span"
            sx={{
              color: colors.accent.blue,
              mr: 0.5,
            }}
          >
            ▌
          </Box>
          {title}
          <Box
            component="span"
            sx={{
              color: colors.accent.blue,
              animation: 'blink 1s infinite',
              ml: 0.5,
            }}
          >
            _
          </Box>
        </Box>

        {/* Navigation */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          {navRoutes.map((route) => (
            <Box
              key={route.path}
              component={Link}
              to={route.path}
              sx={{
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize.sm,
                color: location.pathname === route.path
                  ? colors.accent.blue
                  : colors.text.secondary,
                textDecoration: 'none',
                padding: `${spacing.xs} ${spacing.sm}`,
                borderBottom: location.pathname === route.path
                  ? `2px solid ${colors.accent.blue}`
                  : '2px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: colors.accent.blue,
                  borderBottomColor: colors.accent.blue,
                },
              }}
            >
              {route.label}
            </Box>
          ))}

          {/* Admin Link */}
          <Tooltip title="Admin" arrow>
            <IconButton
              component={Link}
              to="/admin"
              size="small"
              sx={{
                color: colors.text.muted,
                '&:hover': {
                  color: colors.accent.blue,
                },
              }}
            >
              <Settings size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default PixelNavbar;
```

**Step 2: 更新 index.jsx 导出**

```javascript
export { PixelNavbar } from './layout/PixelNavbar';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/layout/PixelNavbar.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelNavbar layout component"
```

---

### Task 13: 创建 PixelFooter 组件

**Files:**
- Create: `frontend/src/components/pixel/layout/PixelFooter.jsx`

**Step 1: 创建 PixelFooter.jsx**

```javascript
// frontend/src/components/pixel/layout/PixelFooter.jsx
import { Box, Link as MuiLink } from '@mui/material';
import { colors, typography, spacing } from '../tokens';

/**
 * PixelFooter - 终端风格页脚
 */
export function PixelFooter({ icp = '粤ICP备2025420529号' }) {
  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        textAlign: 'center',
        py: 1.5,
        fontSize: typography.fontSize.xs,
        fontFamily: typography.fontFamily.mono,
        backgroundColor: colors.bg.secondary,
        borderTop: `1px dashed ${colors.border.default}`,
        color: colors.text.muted,
      }}
    >
      <MuiLink
        href="https://beian.miit.gov.cn"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          color: colors.text.muted,
          textDecoration: 'none',
          '&:hover': {
            color: colors.accent.blue,
          },
        }}
      >
        {icp}
      </MuiLink>
    </Box>
  );
}

export default PixelFooter;
```

**Step 2: 更新 index.jsx 导出**

```javascript
export { PixelFooter } from './layout/PixelFooter';
```

**Step 3: 提交**

```bash
git add frontend/src/components/pixel/layout/PixelFooter.jsx frontend/src/components/pixel/index.jsx
git commit -m "feat(pixel): add PixelFooter layout component"
```

---

## Phase 4: 前台页面替换

### Task 14: 更新 App.jsx 使用 PixelProvider

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: 替换 App.jsx**

```javascript
// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { PixelProvider } from './components/pixel';

// 路由级别懒加载
const Navbar = lazy(() => import('./components/pixel/layout/PixelNavbar'));
const Footer = lazy(() => import('./components/pixel/layout/PixelFooter'));
const Home = lazy(() => import('./components/Home'));
const Projects = lazy(() => import('./components/Projects'));
const Articles = lazy(() => import('./components/Articles'));
const ArticleDetail = lazy(() => import('./components/ArticleDetail'));
const AdminRoutes = lazy(() => import('./admin/routes'));

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <Box sx={{ pb: isAdmin ? 0 : '48px' }}>
      {!isAdmin && (
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '56px', bgcolor: 'background.paper' }}>
            <CircularProgress size={20} sx={{ color: 'primary.main' }} />
          </Box>
        }>
          <Navbar />
        </Suspense>
      )}
      <Routes>
        <Route path="/articles/:id" element={
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          }>
            <ArticleDetail />
          </Suspense>
        } />
        <Route path="/" element={
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          }>
            <>
              <Home />
              <Projects />
            </>
          </Suspense>
        } />
        <Route path="/articles" element={
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          }>
            <Articles />
          </Suspense>
        } />
      </Routes>
      {!isAdmin && <Footer />}
    </Box>
  );
}

function App() {
  return (
    <PixelProvider>
      <Router>
        <Box sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          color: 'text.primary'
        }}>
          <Routes>
            <Route path="/*" element={<AppContent />} />
            <Route path="/admin/*" element={
              <Suspense fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                  <CircularProgress sx={{ color: 'primary.main' }} />
                </Box>
              }>
                <AdminRoutes />
              </Suspense>
            } />
          </Routes>
        </Box>
      </Router>
    </PixelProvider>
  );
}

export default App;
```

**Step 2: 提交**

```bash
git add frontend/src/App.jsx
git commit -m "refactor: integrate PixelProvider into App"
```

---

### Task 15: 重构 Home.jsx 页面

**Files:**
- Modify: `frontend/src/components/Home.jsx`

**Step 1: 重构 Home.jsx**

```javascript
// frontend/src/components/Home.jsx
import { motion } from 'framer-motion';
import { Box, Typography, Container } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useState, useEffect } from 'react';
import { getApiUrl, unwrapApiPayload } from '../config/api';

import { PixelContainer, PixelCard, PixelButton, PixelAvatar, PixelChip, PixelTypography, TerminalLine, CodeBlock } from '../components/pixel';
import LazyImage from './LazyImage';
import LazyGitHubCalendar from './LazyGitHubCalendar';
import SkillsSection from './SkillsSection';
import ContactSection from './ContactSection';

const Home = () => {
  const [siteBlock, setSiteBlock] = useState(null);
  const [aboutBlock, setAboutBlock] = useState(null);
  const [skills, setSkills] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');

  const fetchSiteBlock = async () => {
    try {
      const res = await fetch(getApiUrl.siteBlocks());
      const data = await res.json();
      const blocks = unwrapApiPayload(data) || [];
      setSiteBlock(blocks.find(b => b.name === 'home'));
      setAboutBlock(blocks.find(b => b.name === 'about'));
    } catch { /* silent */ }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch(getApiUrl.skills());
      const data = await res.json();
      setSkills(unwrapApiPayload(data) || []);
    } catch { /* silent */ }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch(getApiUrl.contacts());
      const data = await res.json();
      setContacts(unwrapApiPayload(data) || []);
    } catch { /* silent */ }
  };

  const fetchAvatar = async () => {
    try {
      const res = await fetch(getApiUrl.avatars());
      const data = await res.json();
      const avatars = unwrapApiPayload(data) || data.avatars || [];
      const current = avatars.find(a => a.is_current);
      setAvatarUrl(current ? getApiUrl.avatarFile(current.filename) : '/avatar.webp');
    } catch {
      setAvatarUrl('/avatar.webp');
    }
  };

  useEffect(() => {
    fetchSiteBlock();
    fetchSkills();
    fetchContacts();
    fetchAvatar();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <PixelContainer section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Terminal Header */}
          <Box className="terminal-header" sx={{ mb: 3 }}>
            ~/handywote
          </Box>

          {/* Hero Card */}
          <PixelCard accentLine>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {avatarUrl && (
                  <LazyImage
                    src={avatarUrl}
                    alt="HandyWote"
                    fallbackSrc="/avatar.webp"
                    component={PixelAvatar}
                    size="xlarge"
                    sx={{ mb: 3, mx: 'auto' }}
                  />
                )}
              </motion.div>

              {/* Title with cursor blink */}
              <Typography
                variant="h1"
                className="cursor-blink"
                sx={{
                  fontFamily: 'fontFamily.mono',
                  fontSize: { xs: '2rem', sm: '3rem' },
                  mb: 1,
                }}
              >
                {siteBlock?.title || 'HandyWote'}
              </Typography>

              {/* Subtitle */}
              <Typography
                variant="h4"
                sx={{
                  fontStyle: 'italic',
                  color: 'text.secondary',
                  fontSize: { xs: '1.25rem', sm: '1.75rem' },
                  mb: 2,
                }}
              >
                {siteBlock?.subtitle || '少年侠气交结五都雄！'}
              </Typography>

              {/* Author */}
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  fontFamily: 'fontFamily.mono',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  mb: 4,
                }}
              >
                {siteBlock?.author || '汕头大学 | 黄应辉'}
              </Typography>

              {/* CTA Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <PixelButton
                  variant="primary"
                  suffix="→"
                  component={GitHubIcon}
                  href={siteBlock?.github_url || 'https://github.com/HandyWote'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </PixelButton>
                <PixelButton
                  variant="outline"
                  suffix="→"
                  component="a"
                  href="#about"
                >
                  About Me
                </PixelButton>
              </Box>

              {/* GitHub Calendar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <Box
                  className="pixel-grid-bg"
                  sx={{
                    mt: 4,
                    p: 3,
                    border: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <PixelTypography muted sx={{ mb: 2, fontSize: '0.75rem' }}>
                    // GitHub Contributions
                  </PixelTypography>
                  <LazyGitHubCalendar
                    src={siteBlock?.github_calendar_url || "https://ghchart.rshah.org/HandyWote"}
                    alt="GitHub Contributions"
                  />
                </Box>
              </motion.div>
            </Box>
          </PixelCard>
        </motion.div>
      </PixelContainer>

      {/* About Section */}
      <PixelContainer section id="about">
        <TerminalLine>cd ~/about</TerminalLine>

        <PixelCard title="教育背景" accentLine sx={{ mt: 3 }}>
          <Typography
            variant="body2"
            component="div"
            sx={{ color: 'text.secondary' }}
            dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.education_background || '<span style="color:#484f58">暂无内容</span>' }}
          />
        </PixelCard>

        <PixelCard title="兴趣爱好" accentLine sx={{ mt: 3 }}>
          <Typography
            variant="body2"
            component="div"
            sx={{ color: 'text.secondary' }}
            dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.hobbies || '<span style="color:#484f58">暂无内容</span>' }}
          />
        </PixelCard>

        <PixelCard title="个人愿景" accentLine sx={{ mt: 3 }}>
          <Typography
            variant="body2"
            component="div"
            sx={{ color: 'text.secondary' }}
            dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.personal_vision || '<span style="color:#484f58">暂无内容</span>' }}
          />
        </PixelCard>
      </PixelContainer>

      {/* Skills Section */}
      <SkillsSection skills={skills} />

      {/* Contact Section */}
      <ContactSection
        contacts={contacts}
        contactDescription={siteBlock?.contact_description}
      />
    </>
  );
};

export default Home;
```

**Step 2: 提交**

```bash
git add frontend/src/components/Home.jsx
git commit -m "refactor(home): apply Terminal Aesthetics to Home page"
```

---

### Task 16: 重构 Articles.jsx 和 ArticleCard.jsx

**Files:**
- Modify: `frontend/src/components/Articles.jsx`
- Modify: `frontend/src/components/ArticleCard.jsx`

**Step 1: 重构 ArticleCard.jsx**

```javascript
// frontend/src/components/ArticleCard.jsx
import { Box, Typography, Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import { Calendar, Tag } from 'lucide-react';
import { PixelCard, PixelChip, PixelTypography } from '../components/pixel';
import LazyImage from './LazyImage';

export function ArticleCard({ article, showImage = true }) {
  const { id, title, summary, cover_image, tags = [], created_at } = article;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2 digit', day: '2 digit' });
  };

  return (
    <PixelCard
      component={Link}
      to={`/articles/${id}`}
      accentLine
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': {
          textDecoration: 'none',
          color: 'inherit',
        },
      }}
    >
      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Cover Image */}
        {showImage && cover_image && (
          <LazyImage
            src={cover_image}
            alt={title}
            fallbackSrc="/placeholder.webp"
            sx={{
              width: { xs: '100%', sm: '160px', md: '180px' },
              height: { xs: '140px', sm: '120px', md: '140px' },
              objectFit: 'cover',
              flexShrink: 0,
              alignSelf: 'flex-start',
            }}
          />
        )}

        {/* Content */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* Title */}
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'fontFamily.mono',
              fontSize: { xs: '1rem', sm: '1.125rem' },
              fontWeight: 600,
              mb: 1,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>

          {/* Summary */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {summary || '暂无摘要'}
          </Typography>

          {/* Meta */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Date */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Calendar size={12} color="#8b949e" />
              <PixelTypography muted sx={{ fontSize: '0.7rem' }}>
                {formatDate(created_at)}
              </PixelTypography>
            </Box>

            {/* Tags */}
            {tags.slice(0, 3).map((tag) => (
              <PixelChip key={tag} label={tag} size="small" />
            ))}
            {tags.length > 3 && (
              <PixelTypography muted sx={{ fontSize: '0.7rem' }}>
                +{tags.length - 3}
              </PixelTypography>
            )}
          </Box>
        </Box>
      </Box>
    </PixelCard>
  );
}

export default ArticleCard;
```

**Step 2: 重构 Articles.jsx**

```javascript
// frontend/src/components/Articles.jsx
import { useState, useEffect } from 'react';
import { Box, Typography, TextField, InputAdornment } from '@mui/material';
import { Search } from 'lucide-react';
import { PixelContainer, PixelCard, PixelTypography, TerminalLine, PixelInput } from '../components/pixel';
import ArticleCard from './ArticleCard';
import ArticlePagination from './ArticlePagination';
import { getApiUrl, unwrapApiPayload } from '../config/api';

function Articles() {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: 10 });
      if (search) params.append('search', search);
      if (tag) params.append('tag', tag);

      const res = await fetch(`${getApiUrl.articles()}?${params}`);
      const data = await res.json();
      const payload = unwrapApiPayload(data);
      setArticles(payload?.items || []);
      setTotalPages(payload?.total_pages || 1);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [page, search, tag]);

  return (
    <PixelContainer section>
      {/* Header */}
      <TerminalLine>cat articles.md</TerminalLine>

      <PixelCard sx={{ mt: 3 }}>
        {/* Search */}
        <Box sx={{ mb: 3 }}>
          <PixelInput
            fullWidth
            placeholder="搜索文章..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#8b949e" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Article count */}
        <PixelTypography muted sx={{ mb: 2, fontSize: '0.75rem' }}>
          // {articles.length} articles found
        </PixelTypography>

        {/* Article list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
          {articles.length === 0 && !loading && (
            <PixelTypography muted sx={{ textAlign: 'center', py: 4 }}>
              No articles found.
            </PixelTypography>
          )}
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ mt: 4 }}>
            <ArticlePagination
              page={page}
              count={totalPages}
              onChange={(_, newPage) => setPage(newPage)}
            />
          </Box>
        )}
      </PixelCard>
    </PixelContainer>
  );
}

export default Articles;
```

**Step 3: 提交**

```bash
git add frontend/src/components/ArticleCard.jsx frontend/src/components/Articles.jsx
git commit -m "refactor(articles): apply Terminal Aesthetics to Articles"
```

---

### Task 17: 重构 Projects.jsx

**Files:**
- Modify: `frontend/src/components/Projects.jsx`

**Step 1: 重构 Projects.jsx**

```javascript
// frontend/src/components/Projects.jsx
import { Box, Typography } from '@mui/material';
import { ExternalLink, Star, GitFork } from 'lucide-react';
import { motion } from 'framer-motion';
import { PixelContainer, PixelCard, PixelButton, PixelChip, PixelTypography, TerminalLine } from '../components/pixel';

const projects = [
  {
    name: 'handywote.github.io',
    description: '个人网站 - 基于 React + Material-UI',
    url: 'https://github.com/HandyWote/handywote.github.io',
    stars: 0,
    forks: 0,
    language: 'JavaScript',
  },
  {
    name: 'MyWebsite',
    description: '全栈个人网站 - React + Flask + PostgreSQL',
    url: 'https://github.com/HandyWote/MyWebsite',
    stars: 0,
    forks: 0,
    language: 'Python',
  },
];

function Projects() {
  return (
    <PixelContainer section id="projects">
      <TerminalLine>ls -la ~/projects/</TerminalLine>

      <Box sx={{ mt: 3, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {projects.map((project, index) => (
          <motion.div
            key={project.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <PixelCard
              title={project.name}
              footer={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <PixelChip label={project.language} variant="accent" />
                  </Box>
                  <PixelButton
                    variant="ghost"
                    size="small"
                    suffix={<ExternalLink size={14} />}
                    component="a"
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </PixelButton>
                </Box>
              }
            >
              <PixelTypography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                {project.description}
              </PixelTypography>
            </PixelCard>
          </motion.div>
        ))}
      </Box>
    </PixelContainer>
  );
}

export default Projects;
```

**Step 2: 提交**

```bash
git add frontend/src/components/Projects.jsx
git commit -m "refactor(projects): apply Terminal Aesthetics to Projects"
```

---

### Task 18: 重构 ContactSection.jsx

**Files:**
- Modify: `frontend/src/components/ContactSection.jsx`

**Step 1: 重构 ContactSection.jsx**

```javascript
// frontend/src/components/ContactSection.jsx
import { Box, Typography } from '@mui/material';
import { PixelContainer, PixelCard, PixelTypography, TerminalLine } from '../components/pixel';
import SocialIcons from './SocialIcons';

function ContactSection({ contacts = [], contactDescription }) {
  return (
    <PixelContainer section id="contact">
      <TerminalLine>ping contact</TerminalLine>

      <PixelCard title="联系方式" accentLine sx={{ mt: 3 }}>
        {contactDescription && (
          <PixelTypography sx={{ mb: 2, color: 'text.secondary' }}>
            {contactDescription}
          </PixelTypography>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <SocialIcons contacts={contacts} />
        </Box>
      </PixelCard>
    </PixelContainer>
  );
}

export default ContactSection;
```

**Step 2: 提交**

```bash
git add frontend/src/components/ContactSection.jsx
git commit -m "refactor(contact): apply Terminal Aesthetics to ContactSection"
```

---

### Task 19: 重构 SkillsSection.jsx

**Files:**
- Modify: `frontend/src/components/SkillsSection.jsx`

**Step 1: 重构 SkillsSection.jsx**

```javascript
// frontend/src/components/SkillsSection.jsx
import { Box, Typography } from '@mui/material';
import { PixelContainer, PixelCard, PixelChip, PixelTypography, TerminalLine } from '../components/pixel';

function SkillsSection({ skills = [] }) {
  return (
    <PixelContainer section id="skills">
      <TerminalLine>cat skills.json</TerminalLine>

      <PixelCard title="技能清单" accentLine sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {skills.map((skill) => (
            <PixelChip
              key={skill.id || skill.name}
              label={skill.name}
              variant={skill.level > 80 ? 'accent' : 'default'}
            />
          ))}
          {skills.length === 0 && (
            <PixelTypography muted>
              No skills available.
            </PixelTypography>
          )}
        </Box>
      </PixelCard>
    </PixelContainer>
  );
}

export default SkillsSection;
```

**Step 2: 提交**

```bash
git add frontend/src/components/SkillsSection.jsx
git commit -m "refactor(skills): apply Terminal Aesthetics to SkillsSection"
```

---

## Phase 5: Admin 替换

### Task 20: 重构 AdminLayout.jsx

**Files:**
- Modify: `frontend/src/admin/components/AdminLayout.jsx`

**Step 1: 重构 AdminLayout.jsx**

```javascript
// frontend/src/admin/components/AdminLayout.jsx
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Article, MessageSquare, User, Settings, Image, FileText, LayoutDashboard } from 'lucide-react';
import { colors, typography, spacing } from '../../components/pixel/tokens';

const drawerWidth = 240;

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/articles', label: 'Articles', icon: Article },
  { path: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { path: '/admin/contacts', label: 'Contacts', icon: User },
  { path: '/admin/skills', label: 'Skills', icon: Settings },
  { path: '/admin/avatars', label: 'Avatars', icon: Image },
  { path: '/admin/content', label: 'Site Content', icon: FileText },
];

function AdminLayout() {
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: colors.bg.secondary,
            borderRight: `${colors.border.default}`,
          },
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            p: 2,
            borderBottom: `${colors.border.default}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ color: colors.accent.blue }}>▌</Box>
          <Typography
            sx={{
              fontFamily: typography.fontFamily.mono,
              fontWeight: 600,
              color: colors.text.primary,
            }}
          >
            Admin Panel
          </Typography>
        </Box>

        {/* Menu */}
        <List sx={{ pt: 2 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  sx={{
                    mx: 1,
                    borderRadius: 0,
                    bgcolor: isActive ? colors.interactive.hover : 'transparent',
                    borderLeft: isActive ? `3px solid ${colors.accent.blue}` : '3px solid transparent',
                    '&:hover': {
                      bgcolor: colors.interactive.hover,
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? colors.accent.blue : colors.text.secondary, minWidth: 36 }}>
                    <Icon size={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: typography.fontSize.sm,
                      color: isActive ? colors.text.primary : colors.text.secondary,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Back to site */}
        <Box sx={{ mt: 'auto', p: 2, borderTop: `${colors.border.default}` }}>
          <ListItemButton
            component={Link}
            to="/"
            sx={{
              borderRadius: 0,
              color: colors.text.muted,
              '&:hover': {
                color: colors.accent.blue,
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
              <LayoutDashboard size={18} />
            </ListItemIcon>
            <ListItemText
              primary="Back to Site"
              primaryTypographyProps={{
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize.sm,
              }}
            />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          bgcolor: colors.bg.primary,
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default AdminLayout;
```

**Step 2: 提交**

```bash
git add frontend/src/admin/components/AdminLayout.jsx
git commit -m "refactor(admin): apply Terminal Aesthetics to AdminLayout"
```

---

### Task 21: 更新 Admin 组件样式

**Files:**
- Modify: `frontend/src/admin/components/articles/ArticleEditDialog.jsx`
- Modify: `frontend/src/admin/components/ArticlesManager.jsx`
- Modify: `frontend/src/admin/components/Login.jsx`

（具体重构内容根据各组件复杂度调整，主要替换 Button、Card、Input 等为 Pixel 组件）

**Step 1: 更新 Login.jsx**

```javascript
// frontend/src/admin/components/Login.jsx 简化示例
import { Box, Typography } from '@mui/material';
import { PixelContainer, PixelCard, PixelButton, PixelInput } from '../../components/pixel';

function Login() {
  return (
    <PixelContainer section>
      <PixelCard title="Admin Login" accentLine sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
        <PixelInput fullWidth label="Username" sx={{ mb: 2 }} />
        <PixelInput fullWidth label="Password" type="password" sx={{ mb: 3 }} />
        <PixelButton fullWidth variant="primary">Login</PixelButton>
      </PixelCard>
    </PixelContainer>
  );
}
```

**Step 2: 提交**

```bash
git add frontend/src/admin/components/Login.jsx
git commit -m "refactor(admin): apply Terminal Aesthetics to Login page"
```

---

## Phase 6: 收尾

### Task 22: 清理旧样式

**Files:**
- Remove: `frontend/src/theme/theme.js`（旧主题）
- Modify: `frontend/src/App.css`（移除旧样式）

**Step 1: 清理**

```bash
# 备份旧主题（可选）
mv frontend/src/theme/theme.js frontend/src/theme/theme.js.bak

# 清理旧 App.css（保留必要的基础样式）
rm frontend/src/App.css
```

**Step 2: 提交**

```bash
git add -A
git commit -m "chore: remove legacy styles and theme"
```

---

### Task 23: 最终测试

**Step 1: 运行开发服务器验证**

```bash
cd frontend && npm run dev
```

**Step 2: 验证页面**
- 首页正常加载
- 导航切换正常
- 文章列表正常
- Admin 登录正常

**Step 3: 提交**

```bash
git add -A
git commit -m "feat: complete Terminal Aesthetics frontend refactor"
```

---

## 总结

完成上述任务后，前端将：
1. ✅ 使用全新的 Terminal Aesthetics 视觉风格
2. ✅ 拥有完整的像素风格组件库
3. ✅ 前台和 Admin 全部完成重构
4. ✅ 代码完全组件化和模块化

---

**Plan complete and saved to `docs/plans/2026-03-22-terminal-aesthetics-plan.md`**

## 两种执行选项：

**1. Subagent-Driven (当前 session)** - 我 dispatch fresh subagent per task，任务间 review，快速迭代

**2. Parallel Session (独立 session)** - 在 worktree 中打开新 session，使用 executing-plans，批量执行带检查点

**选择哪种方式？**
