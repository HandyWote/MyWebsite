// frontend/src/components/pixel/ui/PixelCard.jsx
import { Card as MuiCard, CardContent, CardActions, Typography } from '@mui/material';
import { colors, typography, spacing, animations, borders } from '../tokens';

/**
 * PixelCard - 终端风格卡片组件
 *
 * 特点:
 * - 左侧蓝色竖线强调
 * - 虚线边框，hover 变实线
 * - 扁平化无阴影
 */
export function PixelCard({
  title,
  subtitle,
  children,
  footer,
  accentLine = true,
  ...props
}) {
  return (
    <MuiCard
      {...props}
      sx={{
        borderRadius: 0,
        border: `${borders.default} ${colors.border.default}`,
        backgroundColor: colors.bg.secondary,
        transition: animations.normal,
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          borderColor: colors.border.accent,
          borderStyle: 'solid',
          transform: 'translateY(-2px)',
        },
        // 左侧蓝色强调线
        '&::before': accentLine ? {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: colors.accent.blue,
        } : {},
        ...props.sx,
      }}
    >
      {(title || subtitle) && (
        <CardContent
          sx={{
            pb: accentLine ? spacing.md : spacing.sm,
            pl: accentLine ? `${spacing.lg} !important` : spacing.md,
            '&:last-child': { pb: spacing.md },
          }}
        >
          {title && (
            <Typography
              variant="h5"
              component="h3"
              sx={{
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize.lg,
                fontWeight: 600,
                color: colors.text.primary,
                mb: subtitle ? spacing.xs : 0,
              }}
            >
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                fontFamily: typography.fontFamily.mono,
                color: colors.text.secondary,
                fontSize: typography.fontSize.xs,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </CardContent>
      )}
      {children && (
        <CardContent
          sx={{
            pt: accentLine ? 0 : spacing.sm,
            pl: accentLine ? `${spacing.lg} !important` : spacing.md,
            '&:last-child': { pb: spacing.md },
          }}
        >
          {children}
        </CardContent>
      )}
      {footer && (
        <CardActions
          sx={{
            px: spacing.md,
            pb: spacing.md,
            pt: 0,
            borderTop: `1px dashed ${colors.border.muted}`,
            ml: accentLine ? `${spacing.lg} !important` : 0,
          }}
        >
          {footer}
        </CardActions>
      )}
    </MuiCard>
  );
}

export default PixelCard;