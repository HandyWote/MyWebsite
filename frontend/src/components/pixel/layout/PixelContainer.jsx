import { Box } from '@mui/material';
import { colors } from '../tokens';

/**
 * PixelContainer - 终端风格响应式容器
 *
 * 特点:
 * - 终端窗口角标装饰 ┌ ─ ┐
 * - 响应式宽度控制
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
          ? 'clamp(12px, 2vh, 24px) clamp(16px, 7vw, 48px)'
          : 0,
        gap: 'clamp(6px, 1vh, 12px)',
        position: 'relative',
        ...props.sx,
      }}
    >
      {section && (
        <>
          {/* 终端窗口角标 - 左上 */}
          <Box
            data-testid="pixel-corner-tl"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 16,
              height: 16,
              borderLeft: `2px solid ${colors.accent.blue}`,
              borderTop: `2px solid ${colors.accent.blue}`,
              opacity: 0.6,
            }}
          />
          {/* 终端窗口角标 - 右上 */}
          <Box
            data-testid="pixel-corner-tr"
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 16,
              height: 16,
              borderRight: `2px solid ${colors.accent.blue}`,
              borderTop: `2px solid ${colors.accent.blue}`,
              opacity: 0.6,
            }}
          />
          {/* 终端窗口角标 - 左下 */}
          <Box
            data-testid="pixel-corner-bl"
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 16,
              height: 16,
              borderLeft: `2px solid ${colors.accent.blue}`,
              borderBottom: `2px solid ${colors.accent.blue}`,
              opacity: 0.6,
            }}
          />
          {/* 终端窗口角标 - 右下 */}
          <Box
            data-testid="pixel-corner-br"
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 16,
              height: 16,
              borderRight: `2px solid ${colors.accent.blue}`,
              borderBottom: `2px solid ${colors.accent.blue}`,
              opacity: 0.6,
            }}
          />
        </>
      )}
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
