/**
 * 主题配置文件
 * 集中管理所有样式变量和主题配置
 */

// 颜色配置
export const colors = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
  },
  secondary: {
    main: '#dc004e',
    light: '#ff5983',
    dark: '#9a0036',
  },
  background: {
    default: '#ffffff',
    paper: '#f5f5f5',
  },
  text: {
    primary: '#000000',
    secondary: '#666666',
    disabled: '#999999',
  },
  // 玻璃态效果颜色
  glass: {
    background: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(255, 255, 255, 0.2)',
    backgroundDark: 'rgba(30, 30, 30, 0.8)',
    borderDark: 'rgba(255, 255, 255, 0.1)',
  },
  // 阴影配置
  shadow: {
    light: 'rgba(0, 0, 0, 0.15)',
    dark: 'rgba(255, 255, 255, 0.1)',
  },
};

// 间距配置
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// 字体大小配置
export const typography = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
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

// 边框圆角配置
export const borderRadius = {
  small: 4,
  medium: 8,
  large: 16,
  extraLarge: 24,
  circle: '50%',
};

// 过渡动画配置
export const transitions = {
  fast: '0.15s ease-in-out',
  normal: '0.3s ease-in-out',
  slow: '0.5s ease-in-out',
};

// 断点配置
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
};

// 玻璃态效果样式
export const glassEffect = {
  backgroundColor: colors.glass.background,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${colors.glass.border}`,
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  '@media (prefers-color-scheme: dark)': {
    backgroundColor: colors.glass.backgroundDark,
    border: `1px solid ${colors.glass.borderDark}`,
    color: colors.text.secondary,
  },
};

// 卡片悬停效果
export const cardHover = {
  transition: transitions.normal,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 8px 25px ${colors.shadow.light}`,
    '@media (prefers-color-scheme: dark)': {
      boxShadow: `0 8px 25px ${colors.shadow.dark}`,
    },
  },
};

// 响应式容器样式
export const responsiveContainer = {
  maxWidth: '800px',
  margin: '0 auto',
  padding: spacing.lg,
  borderRadius: borderRadius.large,
  '@media (max-width: 959px)': {
    padding: spacing.md,
  },
};

// 文章卡片样式
export const articleCard = {
  height: { xs: 'auto', sm: '200px', md: '220px' },
  minHeight: { xs: '180px', sm: '200px', md: '220px' },
  maxHeight: { xs: 'none', sm: '220px', md: '240px' },
  display: 'flex',
  flexDirection: 'row',
  overflow: 'hidden',
  position: 'relative',
  ...cardHover,
  ...glassEffect,
};

// 文章卡片媒体样式
export const articleCardMedia = {
  width: { xs: '120px', sm: '160px', md: '180px' },
  height: { xs: '120px', sm: '160px', md: '180px' },
  objectFit: 'cover',
  flexShrink: 0,
  borderRadius: borderRadius.medium,
};

// 文章卡片内容样式
export const articleCardContent = {
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: { xs: spacing.sm, sm: spacing.md },
  minWidth: 0,
  overflow: 'hidden',
  height: '100%',
  boxSizing: 'border-box',
};

// 按钮样式
export const buttonStyles = {
  primary: {
    borderRadius: borderRadius.extraLarge,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: typography.fontSize.md,
    fontWeight: 500,
    textTransform: 'none',
    transition: transitions.normal,
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },
  outlined: {
    borderRadius: borderRadius.extraLarge,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: typography.fontSize.md,
    fontWeight: 500,
    textTransform: 'none',
    transition: transitions.normal,
    borderColor: colors.glass.border,
    color: colors.text.primary,
    '&:hover': {
      borderColor: colors.primary.main,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
};

// 输入框样式
export const inputStyles = {
  height: '50px',
  '& .MuiOutlinedInput-root': {
    height: '50px !important',
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    '& fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.23)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(0, 0, 0, 0.87)',
    },
    '&.Mui-focused fieldset': {
      borderColor: colors.primary.main,
    },
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      '& fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
  '& .MuiInputBase-input': {
    height: '50px !important',
    display: 'flex',
    alignItems: 'center',
    fontSize: typography.fontSize.md,
    padding: `${spacing.md} ${spacing.sm}`,
    boxSizing: 'border-box',
  },
};

// 选择框样式
export const selectStyles = {
  ...inputStyles,
  '& .MuiSelect-select': {
    height: '50px !important',
    display: 'flex',
    alignItems: 'center',
    fontSize: typography.fontSize.md,
    padding: `${spacing.md} ${spacing.sm}`,
    boxSizing: 'border-box',
    lineHeight: '50px',
  },
};

// 标签样式
export const chipStyles = {
  small: {
    height: '24px',
    fontSize: typography.fontSize.xs,
    borderRadius: borderRadius.small,
  },
  medium: {
    height: '32px',
    fontSize: typography.fontSize.sm,
    borderRadius: borderRadius.medium,
  },
};

// 分页样式
export const paginationStyles = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: spacing.xxl,
};

// 加载骨架样式
export const skeletonStyles = {
  height: '200px',
  display: 'flex',
  flexDirection: 'row',
  backgroundColor: 'rgba(0, 0, 0, 0.05)',
  borderRadius: borderRadius.medium,
  '& .skeleton-image': {
    width: '200px',
    height: '200px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    flexShrink: 0,
  },
  '& .skeleton-content': {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  '& .skeleton-line': {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: borderRadius.small,
    marginBottom: spacing.sm,
  },
};

// 导出默认主题
export default {
  colors,
  spacing,
  typography,
  borderRadius,
  transitions,
  breakpoints,
  glassEffect,
  cardHover,
  responsiveContainer,
  articleCard,
  articleCardMedia,
  articleCardContent,
  buttonStyles,
  inputStyles,
  selectStyles,
  chipStyles,
  paginationStyles,
  skeletonStyles,
};
