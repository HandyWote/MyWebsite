import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

export const appTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'dark',
    primary: { main: tokens.color.accent.blue, dark: tokens.color.accent.blueDim },
    secondary: { main: tokens.color.accent.blueBright },
    error: { main: tokens.color.status.error },
    warning: { main: tokens.color.status.warning },
    success: { main: tokens.color.status.success },
    background: { default: tokens.color.bg.primary, paper: tokens.color.bg.secondary },
    text: { primary: tokens.color.text.primary, secondary: tokens.color.text.secondary, disabled: tokens.color.text.muted },
    divider: tokens.color.border.default,
  },
  typography: {
    fontFamily: tokens.font.sans,
    h1: { fontFamily: tokens.font.mono, fontSize: tokens.font.size.xxxl, fontWeight: 700 },
    h2: { fontFamily: tokens.font.mono, fontSize: tokens.font.size.xxl, fontWeight: 600 },
    h3: { fontFamily: tokens.font.mono, fontSize: tokens.font.size.xl, fontWeight: 600 },
    h4: { fontFamily: tokens.font.mono, fontSize: tokens.font.size.lg, fontWeight: 500 },
    h5: { fontFamily: tokens.font.mono, fontSize: tokens.font.size.md, fontWeight: 500 },
    h6: { fontFamily: tokens.font.mono, fontSize: tokens.font.size.sm, fontWeight: 500 },
    body1: { fontSize: tokens.font.size.md, lineHeight: 1.7 },
    body2: { fontSize: tokens.font.size.sm, lineHeight: 1.6 },
    button: { fontFamily: tokens.font.mono, textTransform: 'none', fontWeight: 500 },
    caption: { fontSize: tokens.font.size.xs },
  },
  shape: { borderRadius: 0 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: tokens.color.bg.primary, color: tokens.color.text.primary, scrollBehavior: 'smooth' },
        '::selection': { backgroundColor: tokens.color.accent.blue, color: tokens.color.bg.primary },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 0, transition: tokens.transition.normal },
        outlined: { borderStyle: 'dashed', '&:hover': { borderStyle: 'solid' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `1px dashed ${tokens.color.border.default}`,
          backgroundColor: tokens.color.bg.secondary,
          transition: tokens.transition.normal,
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { borderRadius: 0, backgroundColor: tokens.color.bg.secondary } } },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            '& fieldset': { borderStyle: 'dashed' },
            '&:hover fieldset': { borderStyle: 'solid' },
          },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 0, fontFamily: tokens.font.mono, fontSize: tokens.font.size.xs } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 0, border: `1px solid ${tokens.color.border.default}` } } },
    MuiAppBar: { styleOverrides: { root: { backgroundColor: tokens.color.bg.secondary, boxShadow: 'none' } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.color.bg.tertiary,
          border: `1px solid ${tokens.color.border.default}`,
          borderRadius: 0,
          fontFamily: tokens.font.mono,
        },
      },
    },
  },
});
