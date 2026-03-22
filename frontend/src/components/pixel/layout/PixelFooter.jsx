import { Box, Link as MuiLink } from '@mui/material';
import { colors, typography, spacing } from '../tokens';

/**
 * PixelFooter - 终端风格页脚
 */
export function PixelFooter({ icp = '粤ICP备2025420529号' }) {
  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        textAlign: 'center',
        py: 1.5,
        fontSize: typography.fontSize.xs,
        fontFamily: typography.fontFamily.mono,
        backgroundColor: colors.bg.secondary,
        borderTop: `1px dashed ${colors.border.default}`,
        color: colors.text.muted,
      }}
    >
      <MuiLink
        href="https://beian.miit.gov.cn"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          color: colors.text.muted,
          textDecoration: 'none',
          '&:hover': {
            color: colors.accent.blue,
          },
        }}
      >
        {icp}
      </MuiLink>
    </Box>
  );
}

export default PixelFooter;