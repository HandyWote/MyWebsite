import { Box } from '@mui/material';
import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      id="screen-host"
      data-screen-host="public"
      sx={{ minHeight: 'calc(100dvh - 24px)', bgcolor: 'background.default', color: 'text.primary' }}
    >
      {children}
    </Box>
  );
}
