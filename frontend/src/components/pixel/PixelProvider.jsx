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