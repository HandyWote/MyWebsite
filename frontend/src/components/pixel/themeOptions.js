import { colors, typography, spacing, borders, shadows, animations } from './tokens';

const assertColorMain = (colorPath, value) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`[PixelTheme] ${colorPath} must be a non-empty string`);
  }
};

export const createPixelThemeOptions = (themeColors = colors) => {
  const palette = {
    mode: 'dark',
    primary: {
      main: themeColors.accent.blue,
      light: themeColors.accent.blue,
      dark: '#1f6feb',
    },
    // 黑白蓝 TUI 风格：secondary 也使用蓝色层级而非红绿语义色
    secondary: {
      main: themeColors.accent.blueDim,
    },
    // 保持 MUI error 语义通道可用，但视觉仍限制在蓝色体系
    error: {
      main: themeColors.accent.blueBright,
    },
    background: {
      default: themeColors.bg.primary,
      paper: themeColors.bg.secondary,
    },
    text: {
      primary: themeColors.text.primary,
      secondary: themeColors.text.secondary,
      disabled: themeColors.text.muted,
    },
    divider: themeColors.border.default,
  };

  assertColorMain('palette.primary.main', palette.primary.main);
  assertColorMain('palette.secondary.main', palette.secondary.main);
  assertColorMain('palette.error.main', palette.error.main);

  return {
    palette,
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
  };
};

export default createPixelThemeOptions;
