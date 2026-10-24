// frontend/src/components/pixel/ui/PixelButton.tsx
import { Button as MuiButton, useTheme } from '@mui/material';
import type { ButtonProps } from '@mui/material/Button';
import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { colors, typography, spacing, animations } from '../tokens';

/**
 * PixelButton - 终端风格按钮组件
 *
 * 变体（variant）—— 决定填充 / 边框形态，默认 primary:
 * - primary（别名 contained）: 强调色填充（默认蓝色带荧光）
 * - outline（别名 outlined）: 透明背景 + 虚线边框
 * - ghost（别名 text）: 无边框
 *
 * 颜色（color）—— 只换「强调色」，不改变上面选择的形态:
 * - primary（默认）: 强调蓝（colors.accent.blue / blueBright）
 * - error / warning / success 等: 取 MUI 主题 palette[color].main
 *   （主题 palette 已由 createPixelThemeOptions 对齐 pixel tokens）
 * - inherit: 前后景色继承，形态仍按 variant 走（用于嵌在带色容器里的弱化按钮）
 *
 * 尺寸（size）:
 * - medium（默认）: padding 8px/16px、字号 sm —— 与历史视觉完全一致
 * - small: padding 4px/8px、字号 xs
 *
 * 其余 props（startIcon / endIcon / component / data-testid / disabled / onClick /
 * href / type ...）原样透传给 MUI Button，因此：
 * - `component="label"` + 隐藏 `<input type="file">` 的上传按钮写法可直接使用；
 * - `startIcon`/`endIcon` 由 MUI 渲染并跟随 size 缩放；
 * - `data-testid` 落在 `<button>`（或 component 指定的根元素）上。
 *
 * 类型：在 MUI ButtonProps 上只收窄 variant / color / size 三处取值（MUI 的
 * outlined/contained/text 作为别名保留），其余 props 原样继承 MUI 类型。
 */
export type PixelButtonVariant =
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'contained'
  | 'outlined'
  | 'text';

export type PixelButtonColor = 'primary' | 'error' | 'warning' | 'success' | 'inherit';

// `prefix` 同时是 HTML 的全局属性（string），会与下面的 ReactNode 槽位相交成
// `string & ReactNode`，故连它一起从 MUI props 里剔除；`suffix` 无此冲突。
export type PixelButtonProps = Omit<ButtonProps, 'variant' | 'color' | 'size' | 'prefix'> & {
  /** 决定填充 / 边框形态，默认 primary（contained / outlined / text 为 MUI 别名）。 */
  variant?: PixelButtonVariant;
  /** 强调色，默认 primary；取值对应 MUI 主题 palette 名。 */
  color?: PixelButtonColor;
  size?: 'small' | 'medium';
  /** 渲染在文案前的节点（与 MUI startIcon 无关）。 */
  prefix?: ReactNode;
  /** 渲染在文案后的节点（与 MUI endIcon 无关）。 */
  suffix?: ReactNode;
  /** 透传到根元素的测试钩子（MUI 的 props 类型不含 data-* 属性）。 */
  'data-testid'?: string;
};

type ResolvedVariant = 'primary' | 'outline' | 'ghost';

interface Accent {
  main: string;
  hover: string;
  text: string;
  onAccent: string;
  glow: string;
  outlineGlow: string;
}

const SIZE_STYLES: Record<'small' | 'medium', { fontSize: string; padding: string }> = {
  small: {
    fontSize: typography.fontSize.xs,
    padding: `${spacing.xs} ${spacing.sm}`,
  },
  medium: {
    fontSize: typography.fontSize.sm,
    padding: `${spacing.sm} ${spacing.md}`,
  },
};

// 默认强调色：与历史 PixelButton 视觉逐像素一致（荧光阴影只在默认蓝色下出现）。
const PRIMARY_ACCENT: Accent = {
  main: colors.accent.blue,
  hover: colors.accent.blueBright,
  text: colors.accent.blueBright,
  onAccent: colors.bg.primary,
  glow: `0 0 20px ${colors.accent.blueGlow}, 0 0 40px ${colors.accent.blueGlow}`,
  outlineGlow: `0 0 12px ${colors.accent.blueGlow}`,
};

const INHERIT_ACCENT: Accent = {
  main: 'transparent',
  hover: colors.interactive.hover,
  text: 'inherit',
  onAccent: 'inherit',
  glow: 'none',
  outlineGlow: 'none',
};

const VARIANT_ALIASES: Record<PixelButtonVariant, ResolvedVariant> = {
  primary: 'primary',
  outline: 'outline',
  ghost: 'ghost',
  contained: 'primary',
  outlined: 'outline',
  text: 'ghost',
};

const resolveVariant = (variant: PixelButtonVariant): ResolvedVariant => VARIANT_ALIASES[variant];

const resolveAccent = (theme: Theme, color: PixelButtonColor): Accent => {
  if (color === 'primary') return PRIMARY_ACCENT;
  if (color === 'inherit') return INHERIT_ACCENT;

  const palette = theme.palette[color];
  const main = palette.main;
  return {
    main,
    hover: palette.light,
    text: main,
    onAccent: colors.bg.primary,
    glow: 'none',
    outlineGlow: 'none',
  };
};

const getVariantStyles = (resolvedVariant: ResolvedVariant, accent: Accent) => {
  switch (resolvedVariant) {
    case 'outline':
      return {
        bgcolor: 'transparent',
        color: accent.text,
        border: `1px dashed ${colors.border.default}`,
        '&:hover': {
          bgcolor: 'transparent',
          borderStyle: 'solid',
          borderColor: accent.text,
          boxShadow: accent.outlineGlow,
        },
      };
    case 'ghost':
      return {
        bgcolor: 'transparent',
        color: colors.text.secondary,
        border: 'none',
        '&:hover': {
          bgcolor: colors.interactive.hover,
          color: accent.text,
          border: 'none',
        },
      };
    case 'primary':
    default:
      return {
        bgcolor: accent.main,
        color: accent.onAccent,
        border: 'none',
        '&:hover': {
          bgcolor: accent.hover,
          border: 'none',
          boxShadow: accent.glow,
        },
      };
  }
};

export function PixelButton({
  children,
  variant = 'primary',
  color = 'primary',
  size = 'medium',
  prefix = null,
  suffix = null,
  sx,
  ...props
}: PixelButtonProps) {
  const theme = useTheme();
  const resolvedVariant = resolveVariant(variant);
  const accent = resolveAccent(theme, color);
  const sizeStyles = SIZE_STYLES[size] ?? SIZE_STYLES.medium;

  return (
    <MuiButton
      color={color}
      size={size}
      {...props}
      sx={{
        fontFamily: typography.fontFamily.mono,
        fontWeight: 600,
        borderRadius: 0,
        transition: `all ${animations.normal}`,
        textTransform: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        ...sizeStyles,
        ...getVariantStyles(resolvedVariant, accent),
        ...sx,
      }}
    >
      {prefix && <span>{prefix}</span>}
      {children}
      {suffix && <span>{suffix}</span>}
    </MuiButton>
  );
}

export default PixelButton;
