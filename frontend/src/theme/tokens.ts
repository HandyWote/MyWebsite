export const tokens = {
  color: {
    bg: { primary: '#0d1117', secondary: '#161b22', tertiary: '#21262d' },
    accent: { blue: '#58a6ff', blueBright: '#79b8ff', blueDim: '#388bfd' },
    text: { primary: '#f0f6fc', secondary: '#8b949e', muted: '#484f58' },
    border: { default: '#30363d', muted: '#21262d', accent: '#58a6ff' },
    status: { success: '#3fb950', warning: '#d29922', error: '#f85149' },
    interactive: { hover: '#1f2428', active: '#2d333b' },
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  font: {
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    sans: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
    size: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.25rem', xl: '1.5rem', xxl: '2rem', xxxl: '3rem' },
  },
  transition: { fast: '0.15s ease', normal: '0.2s ease' },
} as const;

export const colors = {
  bg: tokens.color.bg,
  accent: { ...tokens.color.accent, blueGlow: 'rgba(88, 166, 255, 0.4)' },
  text: tokens.color.text,
  border: tokens.color.border,
  status: { warning: tokens.color.status.warning, error: tokens.color.status.error },
  interactive: tokens.color.interactive,
};
export const spacing = Object.fromEntries(Object.entries(tokens.space).map(([key, value]) => [key, `${value}px`]));
export const typography = { fontFamily: { mono: tokens.font.mono, sans: tokens.font.sans }, fontSize: tokens.font.size };
export const borders = { default: '1px dashed', solid: '1px solid', emphasis: '2px solid', radius: '0' };
export const shadows = { none: 'none' };
export const animations = { ...tokens.transition, slow: '0.3s ease' };
