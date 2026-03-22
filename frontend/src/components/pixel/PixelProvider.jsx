// frontend/src/components/pixel/PixelProvider.jsx
import { createTheme, ThemeProvider } from '@mui/material';
import { createPixelThemeOptions } from './themeOptions';

/**
 * PixelProvider - MUI 主题提供者，集成 Terminal Aesthetics 设计系统
 */
const pixelTheme = createTheme(createPixelThemeOptions());

export function PixelProvider({ children }) {
  return (
    <ThemeProvider theme={pixelTheme}>
      {children}
    </ThemeProvider>
  );
}

export default PixelProvider;
