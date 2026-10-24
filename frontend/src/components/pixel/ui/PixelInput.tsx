// frontend/src/components/pixel/ui/PixelInput.tsx
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material/TextField';
import { colors, typography, spacing, animations } from '../tokens';

/**
 * PixelInput - 终端风格输入框组件（基于 MUI TextField）
 *
 * 支持的写法（全部为 MUI TextField 的原生 props，视觉仍由下面的 sx 统一控制）：
 * - 基础: label / placeholder / value / onChange / disabled / error / required
 * - 文本域: multiline + rows / minRows / maxRows
 * - 下拉: select + children（children 即 MenuItem 列表；Select 级 props 走
 *   `slotProps={{ select: {...} }}`，例如 native 或 renderValue）
 * - 校验: helperText（保留一行高度，避免出现错误文案时页面跳动）
 * - 精细插槽: slotProps（如 `{ input: { startAdornment } }`；formHelperText 的
 *   默认间距会与调用方给的 sx 合并，调用方优先）
 * - 测试钩子: data-testid 落在根节点（FormControl）上，因此既有的
 *   `[data-testid='field-xxx'] input` 查询习惯继续可用
 * - 宽度: fullWidth（原样透传，默认不开，避免改变公开端现有宽度）
 *
 * 说明: 文件选择（`<input type="file">`）不走本组件——用
 * `<PixelButton component="label">` 包一个隐藏 input（见 PixelButton 注释）。
 *
 * 类型: 直接复用 MUI TextFieldProps（它继承自 FormControl / Input / Select 的
 * 类型），因此 label / placeholder / select / children / multiline / helperText /
 * slotProps / sx 等全部是可选 props，调用点不必再补空壳。
 */
export type PixelInputProps = TextFieldProps;

export function PixelInput({
  label,
  placeholder,
  select = false,
  children,
  multiline = false,
  helperText,
  slotProps,
  sx,
  ...props
}: PixelInputProps) {
  // MUI 的 slot props 允许写成 (ownerState) => props；历史实现按对象展开
  // （函数形态展开为空对象，等于丢弃）。这里显式只处理对象形态，行为一致。
  const helperTextSlot = slotProps?.formHelperText;
  const helperTextSlotProps = typeof helperTextSlot === 'function' ? undefined : helperTextSlot;

  const mergedSlotProps: TextFieldProps['slotProps'] = {
    ...slotProps,
    formHelperText: {
      ...helperTextSlotProps,
      sx: {
        mt: spacing.xs,
        ml: 0,
        // 有 helperText 时预留一行高度，避免错误提示出现/消失导致布局跳动。
        minHeight: helperText ? '1.25em' : 0,
        ...helperTextSlotProps?.sx,
      },
    },
  };

  return (
    <TextField
      label={label}
      placeholder={placeholder}
      select={select}
      multiline={multiline}
      helperText={helperText}
      slotProps={mergedSlotProps}
      {...props}
      sx={{
        '& .MuiOutlinedInput-root': {
          fontFamily: typography.fontFamily.mono,
          fontSize: typography.fontSize.sm,
          minHeight: 44,
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
          transform: `translate(${spacing.md}, 11px) scale(1)`,
          '&.Mui-focused': {
            color: colors.accent.blue,
          },
          '&.MuiInputLabel-shrink': {
            transform: `translate(${spacing.md}, -9px) scale(0.75)`,
          },
        },
        '& .MuiOutlinedInput-input': {
          padding: `12px ${spacing.md}`,
        },
        ...sx,
      }}
    >
      {children}
    </TextField>
  );
}

export default PixelInput;
