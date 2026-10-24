// frontend/src/components/pixel/ui/PixelTypography.tsx
import { Typography } from '@mui/material';
import type { TypographyProps } from '@mui/material/Typography';
import type { ElementType } from 'react';
import { colors, typography } from '../tokens';

/**
 * PixelTypography - 终端风格文本组件
 *
 * 类型: 复用 MUI TypographyProps（variant / component / sx / children 等），
 * 额外补充 as / code / muted / accent 四个可选 props。
 */
export type PixelTypographyProps = TypographyProps & {
  /** 自定义渲染组件（优先于 MUI 的 component），默认 MUI Typography。 */
  as?: ElementType<TypographyProps>;
  /** 等宽字体，默认 false。 */
  code?: boolean;
  /** 弱化文字色（text.muted），默认 false。 */
  muted?: boolean;
  /** 强调蓝，默认 false。 */
  accent?: boolean;
};

export function PixelTypography({
  children,
  variant = 'body1',
  as,
  code = false,
  muted = false,
  accent = false,
  ...props
}: PixelTypographyProps) {
  const Component: ElementType<TypographyProps> = as ?? Typography;

  const getColorStyle = () => {
    if (accent) return { color: colors.accent.blue };
    if (muted) return { color: colors.text.muted };
    return {};
  };

  return (
    <Component
      variant={variant}
      {...props}
      sx={{
        fontFamily: code ? typography.fontFamily.mono : 'inherit',
        ...getColorStyle(),
        ...props.sx,
      }}
    >
      {children}
    </Component>
  );
}

/**
 * CodeBlock - 代码风格文本块
 */
export type CodeBlockProps = Omit<PixelTypographyProps, 'code'>;

export function CodeBlock({ children, ...props }: CodeBlockProps) {
  return (
    <PixelTypography
      component="pre"
      code={true}
      {...props}
      sx={{
        bgcolor: colors.bg.tertiary,
        p: 2,
        borderLeft: `3px solid ${colors.accent.blue}`,
        overflow: 'auto',
        fontSize: typography.fontSize.sm,
        ...props.sx,
      }}
    >
      {children}
    </PixelTypography>
  );
}

/**
 * TerminalLine - 终端命令行
 */
export type TerminalLineProps = Omit<PixelTypographyProps, 'code'> & {
  /** 行首提示符，默认 '>'。 */
  prompt?: string;
};

export function TerminalLine({ children, prompt = '>', ...props }: TerminalLineProps) {
  return (
    <PixelTypography
      component="div"
      code={true}
      {...props}
      sx={{
        fontFamily: typography.fontFamily.mono,
        display: 'flex',
        gap: 1,
        '&::before': {
          content: `"${prompt}"`,
          // 历史实现这里写的是 colors.accent.green，但 tokens 里并无 green，
          // 运行时恒为 undefined → 该 color 声明被丢弃。迁移到 TS 后保持不输出
          // color，视觉与迁移前完全一致（补 token 属于另一张单的视觉决策）。
        },
        ...props.sx,
      }}
    >
      {children}
    </PixelTypography>
  );
}

export default PixelTypography;
