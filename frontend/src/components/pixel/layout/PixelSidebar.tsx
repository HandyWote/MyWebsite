import { Box, Typography } from '@mui/material';
import type { BoxProps } from '@mui/material/Box';
import type { ReactNode } from 'react';
import { PixelCard, PixelAvatar, PixelTypography, TerminalLine } from '../index';

/**
 * PixelSidebar - 终端风格侧边栏组件
 *
 * 类型: 复用 MUI BoxProps（sx / children 等），额外补充 title / avatar /
 * name / description 四个可选 props（都有默认值或可缺省）。
 */
// `title` 同时是 HTML 的全局属性（string），先剔除后再声明为 ReactNode。
export type PixelSidebarProps = Omit<BoxProps, 'title'> & {
  /** 顶栏终端提示文案，默认 '~/about'。 */
  title?: ReactNode;
  /** 头像地址；不给则不渲染头像。 */
  avatar?: string;
  /** 姓名（同时作为头像 alt），默认 'HandyWote'。 */
  name?: string;
  /** 一句话简介。 */
  description?: ReactNode;
};

export function PixelSidebar({
  title = '~/about',
  children,
  avatar,
  name = 'HandyWote',
  description = '汕头大学 | 软件工程',
  ...props
}: PixelSidebarProps) {
  return (
    <Box
      {...props}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(6px, 1vh, 12px)',
        ...props.sx,
      }}
    >
      <TerminalLine>{title}</TerminalLine>

      <PixelCard>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
          {avatar && (
            <PixelAvatar src={avatar} alt={name} size={80} />
          )}

          <Box>
            <PixelTypography variant="h4" sx={{ mb: 0.5 }}>
              {name}
            </PixelTypography>
            <Typography
              variant="body2"
              sx={{
                color: 'var(--text-secondary)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.85rem',
              }}
            >
              {description}
            </Typography>
          </Box>
        </Box>
      </PixelCard>

      {children && (
        <PixelCard>
          {children}
        </PixelCard>
      )}
    </Box>
  );
}

export default PixelSidebar;
