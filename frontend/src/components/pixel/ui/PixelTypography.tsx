// frontend/src/components/pixel/ui/PixelTypography.jsx
import { Typography } from '@mui/material';
import { colors, typography } from '../tokens';

/**
 * PixelTypography - 终端风格文本组件
 */
export function PixelTypography({
  children,
  variant = 'body1',
  as,
  code = false,
  muted = false,
  accent = false,
  ...props
}) {
  const Component = as || Typography;

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
export function CodeBlock({ children, ...props }) {
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
export function TerminalLine({ children, prompt = '>', ...props }) {
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
          color: colors.accent.green,
        },
        ...props.sx,
      }}
    >
      {children}
    </PixelTypography>
  );
}

export default PixelTypography;