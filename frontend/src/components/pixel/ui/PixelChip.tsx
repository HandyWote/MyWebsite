// frontend/src/components/pixel/ui/PixelChip.jsx
import { Chip as MuiChip } from '@mui/material';
import { typography, animations } from '../tokens';

/**
 * PixelChip - 终端风格标签组件
 */
export function PixelChip({ label, variant = 'default', ...props }) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return {
          bgcolor: 'primary.main',
          color: 'background.default',
          borderColor: 'primary.main',
        };
      case 'success':
        return {
          bgcolor: 'transparent',
          color: 'success.main',
          borderColor: 'success.main',
        };
      case 'warning':
        return {
          bgcolor: 'transparent',
          color: 'warning.main',
          borderColor: 'warning.main',
        };
      case 'error':
        return {
          bgcolor: 'transparent',
          color: 'error.main',
          borderColor: 'error.main',
        };
      case 'default':
      default:
        return {
          bgcolor: 'background.paper',
          color: 'text.secondary',
          borderColor: 'divider',
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
        border: 1,
        borderColor: 'divider',
        transition: animations.fast,
        ...getVariantStyles(),
        ...props.sx,
      }}
    />
  );
}

export default PixelChip;