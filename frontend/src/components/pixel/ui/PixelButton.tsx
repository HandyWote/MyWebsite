// frontend/src/components/pixel/ui/PixelButton.jsx
import { Button as MuiButton } from '@mui/material';
import { colors, typography, spacing, animations } from '../tokens';

/**
 * PixelButton - 终端风格按钮组件
 *
 * 变体:
 * - primary: 蓝色填充（带荧光效果）
 * - outline: 透明边框
 * - ghost: 无边框
 */
export function PixelButton({
  children,
  variant = 'primary',
  prefix = null,
  suffix = null,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return {
          bgcolor: 'transparent',
          color: colors.accent.blueBright,
          border: `1px dashed ${colors.border.default}`,
          '&:hover': {
            bgcolor: 'transparent',
            borderStyle: 'solid',
            borderColor: colors.accent.blueBright,
            boxShadow: `0 0 12px ${colors.accent.blueGlow}`,
          },
        };
      case 'ghost':
        return {
          bgcolor: 'transparent',
          color: colors.text.secondary,
          border: 'none',
          '&:hover': {
            bgcolor: colors.interactive.hover,
            color: colors.accent.blueBright,
            border: 'none',
          },
        };
      case 'primary':
      default:
        return {
          bgcolor: colors.accent.blue,
          color: colors.bg.primary,
          border: 'none',
          '&:hover': {
            bgcolor: colors.accent.blueBright,
            border: 'none',
            boxShadow: `0 0 20px ${colors.accent.blueGlow}, 0 0 40px ${colors.accent.blueGlow}`,
          },
        };
    }
  };

  return (
    <MuiButton
      {...props}
      sx={{
        fontFamily: typography.fontFamily.mono,
        fontSize: typography.fontSize.sm,
        fontWeight: 600,
        borderRadius: 0,
        padding: `${spacing.sm} ${spacing.md}`,
        transition: `all ${animations.normal}`,
        textTransform: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        ...getVariantStyles(),
        ...props.sx,
      }}
    >
      {prefix && <span>{prefix}</span>}
      {children}
      {suffix && <span>{suffix}</span>}
    </MuiButton>
  );
}

export default PixelButton;