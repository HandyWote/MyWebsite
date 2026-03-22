import { Box, Typography } from '@mui/material';
import { PixelCard, PixelAvatar, PixelTypography, TerminalLine } from '../index';

/**
 * PixelSidebar - 终端风格侧边栏组件
 */
export function PixelSidebar({
  title = '~/about',
  children,
  avatar,
  name = 'HandyWote',
  description = '汕头大学 | 软件工程',
  ...props
}) {
  return (
    <Box
      {...props}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(6px, 1vh, 12px)',
        ...props.sx,
      }}
    >
      <TerminalLine>{title}</TerminalLine>

      <PixelCard>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
          {avatar && (
            <PixelAvatar src={avatar} alt={name} size={80} />
          )}

          <Box>
            <PixelTypography variant="h4" sx={{ mb: 0.5 }}>
              {name}
            </PixelTypography>
            <Typography
              variant="body2"
              sx={{
                color: 'var(--text-secondary)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.85rem',
              }}
            >
              {description}
            </Typography>
          </Box>
        </Box>
      </PixelCard>

      {children && (
        <PixelCard>
          {children}
        </PixelCard>
      )}
    </Box>
  );
}

export default PixelSidebar;
