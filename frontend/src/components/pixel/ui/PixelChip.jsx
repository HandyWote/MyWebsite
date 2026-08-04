// frontend/src/components/pixel/ui/PixelChip.jsx
import { Chip as MuiChip } from '@mui/material';
import { colors, typography, animations } from '../tokens';

/**
 * PixelChip - 终端风格标签组件
 */
export function PixelChip({ label, variant = 'default', ...props }) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return {
          bgcolor: colors.accent.blue,
          color: colors.bg.primary,
          borderColor: colors.accent.blue,
        };
      case 'success':
        return {
          bgcolor: 'transparent',
          color: colors.accent.green,
          borderColor: colors.accent.green,
        };
      case 'warning':
        return {
          bgcolor: 'transparent',
          color: '#d29922',
          borderColor: '#d29922',
        };
      case 'error':
        return {
          bgcolor: 'transparent',
          color: colors.accent.red,
          borderColor: colors.accent.red,
        };
      case 'default':
      default:
        return {
          bgcolor: colors.bg.tertiary,
          color: colors.text.secondary,
          borderColor: colors.border.default,
        };
    }
  };

  return (
    <MuiChip
      label={label}
      size="small"
      {...props}
      sx={{
        fontFamily: typography.fontFamily.mono,
        fontSize: typography.fontSize.xs,
        fontWeight: 500,
        borderRadius: 0,
        height: '24px',
        border: `1px solid ${colors.border.default}`,
        transition: animations.fast,
        ...getVariantStyles(),
        ...props.sx,
      }}
    />
  );
}

export default PixelChip;