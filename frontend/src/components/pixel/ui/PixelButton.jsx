// frontend/src/components/pixel/ui/PixelButton.jsx
import { Button as MuiButton } from '@mui/material';
import { colors, typography, spacing, animations } from '../tokens';

/**
 * PixelButton - 终端风格按钮组件
 *
 * 变体:
 * - primary: 蓝色填充
 * - outline: 透明边框
 * - ghost: 无边框
 * - destructive: 红色填充
 * - secondary: 绿色填充
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
          color: colors.accent.blue,
          border: `${colors.border.default}`,
          borderStyle: 'dashed',
          '&:hover': {
            bgcolor: 'transparent',
            borderStyle: 'solid',
            borderColor: colors.accent.blue,
          },
        };
      case 'ghost':
        return {
          bgcolor: 'transparent',
          color: colors.accent.blue,
          border: 'none',
          '&:hover': {
            bgcolor: colors.interactive.hover,
            border: 'none',
          },
        };
      case 'destructive':
        return {
          bgcolor: colors.accent.red,
          color: colors.text.primary,
          border: 'none',
          '&:hover': {
            bgcolor: '#da3633',
            border: 'none',
          },
        };
      case 'secondary':
        return {
          bgcolor: colors.accent.green,
          color: colors.bg.primary,
          border: 'none',
          '&:hover': {
            bgcolor: '#2ea043',
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
            bgcolor: '#1f6feb',
            border: 'none',
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
        fontWeight: 500,
        borderRadius: 0,
        padding: `${spacing.sm} ${spacing.md}`,
        transition: animations.normal,
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