// frontend/src/components/pixel/ui/PixelAvatar.jsx
import { Avatar as MuiAvatar } from '@mui/material';
import { colors } from '../tokens';

/**
 * PixelAvatar - 终端风格头像组件
 */
export function PixelAvatar({
  src,
  alt,
  size = 'medium',
  pixelBorder = true,
  ...props
}) {
  const sizeMap = {
    small: 32,
    medium: 48,
    large: 80,
    xlarge: 120,
  };

  const pixelSize = sizeMap[size] || sizeMap.medium;

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