// frontend/src/components/pixel/ui/PixelAvatar.tsx
import { Avatar as MuiAvatar } from '@mui/material';
import type { AvatarProps } from '@mui/material/Avatar';
import { colors } from '../tokens';

const SIZE_MAP = {
  small: 32,
  medium: 48,
  large: 80,
  xlarge: 120,
} as const;

/** 预设头像尺寸（像素）。 */
export type PixelAvatarSize = keyof typeof SIZE_MAP;

const isPixelAvatarSize = (size: PixelAvatarSize | number): size is PixelAvatarSize =>
  typeof size === 'string' && size in SIZE_MAP;

/**
 * PixelAvatar - 终端风格头像组件
 *
 * 类型: 复用 MUI AvatarProps（src / alt / sx / children 等），额外补充
 * size / pixelBorder 两个可选 props；未知尺寸（含数字）沿用历史行为回落到 medium。
 */
export type PixelAvatarProps = AvatarProps & {
  /** 预设尺寸，默认 medium；未知取值回落到 medium。 */
  size?: PixelAvatarSize | number;
  /** 方形（2px 直角）边框，默认 true。 */
  pixelBorder?: boolean;
};

export function PixelAvatar({
  src,
  alt,
  size = 'medium',
  pixelBorder = true,
  ...props
}: PixelAvatarProps) {
  const pixelSize = isPixelAvatarSize(size) ? SIZE_MAP[size] : SIZE_MAP.medium;

  return (
    <MuiAvatar
      src={src}
      alt={alt}
      {...props}
      sx={{
        width: pixelSize,
        height: pixelSize,
        borderRadius: pixelBorder ? '2px' : '50%',
        border: pixelBorder ? `2px solid ${colors.border.default}` : 'none',
        transition: 'border-color 0.2s ease',
        '&:hover': pixelBorder ? {
          borderColor: colors.accent.blue,
        } : {},
        ...props.sx,
      }}
    />
  );
}

export default PixelAvatar;
