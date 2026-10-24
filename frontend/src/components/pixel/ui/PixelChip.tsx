// frontend/src/components/pixel/ui/PixelChip.tsx
import { Chip as MuiChip } from '@mui/material';
import type { ChipProps } from '@mui/material/Chip';
import { typography, animations } from '../tokens';

/** 语义变体（只影响取色，不改变 MUI Chip 的形态）。 */
export type PixelChipVariant = 'default' | 'accent' | 'success' | 'warning' | 'error';

/**
 * PixelChip - 终端风格标签组件
 *
 * 类型: 复用 MUI ChipProps（label / icon / onDelete / sx 等），只把 variant
 * 换成「语义取色」的更窄取值。
 */
export type PixelChipProps = Omit<ChipProps, 'variant'> & {
  /** 语义取色，默认 default（中性灰）。 */
  variant?: PixelChipVariant;
};

export function PixelChip({ label, variant = 'default', ...props }: PixelChipProps) {
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
        // borderColor 由下面的变体样式统一给出（每个变体都显式设置）。
        transition: animations.fast,
        ...getVariantStyles(),
        ...props.sx,
      }}
    />
  );
}

export default PixelChip;
