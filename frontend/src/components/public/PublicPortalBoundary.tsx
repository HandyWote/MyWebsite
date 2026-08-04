'use client';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { appTheme } from '@/theme/theme';

function publicScreenContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('screen-host');
}

const publicTheme = createTheme(appTheme, {
  components: {
    MuiModal: { defaultProps: { container: publicScreenContainer } },
    MuiPopover: { defaultProps: { container: publicScreenContainer } },
    MuiPopper: { defaultProps: { container: publicScreenContainer } },
  },
});

export function PublicPortalBoundary({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={publicTheme}>{children}</ThemeProvider>;
}
