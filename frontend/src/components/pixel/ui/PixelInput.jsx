// frontend/src/components/pixel/ui/PixelInput.jsx
import { TextField } from '@mui/material';
import { colors, typography, spacing, animations } from '../tokens';

/**
 * PixelInput - 终端风格输入框组件
 */
export function PixelInput({
  label,
  placeholder,
  prefix,
  suffix,
  ...props
}) {
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      {...props}
      sx={{
        '& .MuiOutlinedInput-root': {
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.sm,
          borderRadius: 0,
          bgcolor: colors.bg.tertiary,
          '& fieldset': {
            borderStyle: 'dashed',
            borderColor: colors.border.default,
            transition: animations.fast,
          },
          '&:hover fieldset': {
            borderStyle: 'solid',
            borderColor: colors.border.default,
          },
          '&.Mui-focused fieldset': {
            borderStyle: 'solid',
            borderColor: colors.accent.blue,
            borderWidth: '1px',
          },
        },
        '& .MuiInputLabel-root': {
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          '&.Mui-focused': {
            color: colors.accent.blue,
          },
        },
        '& .MuiOutlinedInput-input': {
          padding: `${spacing.sm} ${spacing.md}`,
        },
        ...props.sx,
      }}
    />
  );
}

export default PixelInput;