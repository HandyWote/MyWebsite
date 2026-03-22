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