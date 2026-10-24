// 后台布局壳：只提供页面骨架与栅格。表单控件一律用 @/components/pixel（PixelInput /
// PixelButton / PixelDialog），本文件不得再出现任何控件实现。
import type { ReactNode } from 'react';
import { Box, Grid, Paper, Stack, Typography } from '@mui/material';
import type { GridProps, StackProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { colors, typography } from '@/components/pixel';

/** 页宽档位：lg（默认 1200）/ md（900）/ false（不限宽）。 */
export type AdminPageMaxWidth = 'lg' | 'md' | false;

const resolveAdminPageMaxWidth = (maxWidth: AdminPageMaxWidth) => {
  if (maxWidth === false) return 'none';
  if (maxWidth === 'md') return 900;
  return 1200;
};

export interface AdminPageProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  maxWidth?: AdminPageMaxWidth;
  sx?: SxProps<Theme>;
}

export function AdminPage({ title, subtitle, actions, children, maxWidth = 'lg', sx }: AdminPageProps) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: resolveAdminPageMaxWidth(maxWidth),
        mx: 'auto',
        ...sx,
      }}
    >
      {(title || subtitle || actions) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            mb: 3,
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography variant="h4" sx={{ fontFamily: typography.fontFamily.mono }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
        </Stack>
      )}
      {children}
    </Box>
  );
}

export interface AdminSectionProps {
  icon?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** 内部纵向间距（Paper 的 flex gap）。 */
  spacing?: StackProps['spacing'];
  sx?: SxProps<Theme>;
}

export function AdminSection({ icon, title, subtitle, actions, children, spacing: gap = 2.5, sx }: AdminSectionProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap,
        borderColor: colors.border.default,
        ...sx,
      }}
    >
      {(icon || title || subtitle || actions) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0 }}>
            {icon && <Box sx={{ mt: 0.5, flexShrink: 0 }}>{icon}</Box>}
            <Box sx={{ minWidth: 0 }}>
              {title && <Typography variant="h6">{title}</Typography>}
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
        </Stack>
      )}
      {children}
    </Paper>
  );
}

export interface AdminFormStackProps {
  children?: ReactNode;
  spacing?: StackProps['spacing'];
  sx?: SxProps<Theme>;
}

export function AdminFormStack({ children, spacing: gap = 2.5, sx }: AdminFormStackProps) {
  return (
    <Stack spacing={gap} sx={sx}>
      {children}
    </Stack>
  );
}

export interface AdminFieldGridProps {
  children?: ReactNode;
  spacing?: GridProps['spacing'];
  sx?: SxProps<Theme>;
}

export function AdminFieldGrid({ children, spacing: gap = 2.5, sx }: AdminFieldGridProps) {
  return (
    <Grid container spacing={gap} sx={sx}>
      {children}
    </Grid>
  );
}

export interface AdminFieldGridItemProps {
  children?: ReactNode;
  /** 栅格尺寸，默认整行（xs: 12）。 */
  size?: GridProps['size'];
  sx?: SxProps<Theme>;
}

export function AdminFieldGridItem({ children, size = { xs: 12 }, sx }: AdminFieldGridItemProps) {
  return (
    <Grid size={size} sx={sx}>
      {children}
    </Grid>
  );
}

export interface AdminStatsGridProps {
  children?: ReactNode;
  spacing?: GridProps['spacing'];
  sx?: SxProps<Theme>;
}

export function AdminStatsGrid({ children, spacing: gap = 2, sx }: AdminStatsGridProps) {
  return (
    <Grid container spacing={gap} sx={sx}>
      {children}
    </Grid>
  );
}

export interface AdminEmptyStateProps {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  sx?: SxProps<Theme>;
}

export function AdminEmptyState({ title = '暂无数据', description, children, sx }: AdminEmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 3, md: 4 },
        textAlign: 'center',
        borderColor: colors.border.default,
        ...sx,
      }}
    >
      <Typography variant="body1" color="text.secondary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      )}
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Paper>
  );
}

export interface AdminDialogSectionProps {
  icon?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  sx?: SxProps<Theme>;
}

export function AdminDialogSection({ icon, title, subtitle, children, sx }: AdminDialogSectionProps) {
  return (
    <AdminSection icon={icon} title={title} subtitle={subtitle} spacing={2.5} sx={sx}>
      {children}
    </AdminSection>
  );
}
