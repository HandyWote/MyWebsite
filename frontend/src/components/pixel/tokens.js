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
