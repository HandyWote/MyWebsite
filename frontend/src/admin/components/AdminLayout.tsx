'use client';

// AdminLayout组件 - Terminal Aesthetics 风格
//
// 只负责渲染壳（导航/登出/全局通知）：登录校验由 RequireAuth 唯一把关，
// 这里不再重复验票、不再做未授权跳转（旧实现的 5 分钟轮询已删）。
// 也不直读 useNotificationStore：展示字段统一由 useNotification() 给出，
// 本文件不再出现 setTimeout/setInterval（壳里没有任何定时器）。
import type { ReactNode, SyntheticEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, AppBar, Toolbar, Typography, Tabs, Tab, useMediaQuery, Divider } from '@mui/material';
import type { TabsProps } from '@mui/material';
import { Database, FileText, MessageSquare, PenTool, Settings, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clearAuth } from '../utils/auth';
import { PixelButton } from '@/components/pixel';
import { authApi } from '../../api/authApi';
import { colors, typography } from '../../components/pixel/tokens';
import NotificationSnackbar from '../../components/NotificationSnackbar';
import useNotification from '../../hooks/useNotification';

interface AdminTab {
  label: string;
  path: string;
  icon: LucideIcon;
}

const tabList: AdminTab[] = [
  { label: 'Sidebar', path: '/admin/sidebar', icon: Settings },
  { label: 'Articles', path: '/admin/articles', icon: FileText },
  { label: 'Comments', path: '/admin/comments', icon: MessageSquare },
  { label: 'Drawing', path: '/admin/drawing', icon: PenTool },
  { label: 'Data', path: '/admin/data', icon: Database },
];

type TabOrientation = NonNullable<TabsProps['orientation']>;

interface AdminLayoutProps {
  children?: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useMediaQuery('(max-width:900px)');
  const tabValue = tabList.findIndex(tab => pathname === tab.path);

  // 全局通知（同一份 Zustand 状态：子页面 show，这里只负责展示）
  const notify = useNotification();

  const handleTabChange = (_event: SyntheticEvent, idx: number) => {
    router.push(tabList[idx].path);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 即使后端登出失败，前端也清除认证
    }
    clearAuth();
    router.replace('/');
  };

  const renderTabs = (orientation: TabOrientation = 'vertical') => (
    <Tabs
      orientation={orientation}
      value={tabValue === -1 ? 0 : tabValue}
      onChange={handleTabChange}
      variant="scrollable"
      allowScrollButtonsMobile
      slotProps={{
        indicator: {
          sx: orientation === 'vertical'
            ? { left: 0, width: 3, bgcolor: 'primary.main' }
            : { height: 3 },
        },
      }}
    >
      {tabList.map(tab => {
        const Icon = tab.icon;
        return (
          <Tab
            key={tab.path}
            icon={<Icon size={18} />}
            iconPosition="start"
            label={tab.label}
            sx={{
              px: orientation === 'vertical' ? 3 : 2,
              py: orientation === 'vertical' ? 2 : 1,
              minHeight: 48,
              fontFamily: typography.fontFamily.mono,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              '&.Mui-selected': {
                color: colors.accent.blue,
                bgcolor: colors.interactive.hover,
              },
              '&:hover': {
                bgcolor: colors.interactive.hover,
              },
            }}
          />
        );
      })}
    </Tabs>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg.primary }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar
          sx={{
            minHeight: '56px !important',
            borderBottom: `1px solid ${colors.border.default}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: colors.accent.blue }}>▌</Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: typography.fontFamily.mono,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              Admin Panel
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <PixelButton
            variant="ghost"
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogOut size={16} />}
            sx={{
              fontFamily: typography.fontFamily.mono,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              '&:hover': {
                // tokens 的 accent 只有蓝系（无 red）：此处历史取值一直是 undefined，
                // 即悬停不变色。为不改变既有视觉，保留空值；要变红需另走视觉工单。
                color: undefined,
              },
            }}
          >
            Logout
          </PixelButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: `calc(100vh - 56px)`,
        }}
      >
        {/* Sidebar */}
        {!isMobile && (
          <Box
            sx={{
              width: 220,
              bgcolor: colors.bg.secondary,
              borderRight: `1px solid ${colors.border.default}`,
              pt: 2,
              minHeight: `calc(100vh - 56px)`,
            }}
          >
            {renderTabs('vertical')}
          </Box>
        )}

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            width: '100%',
            bgcolor: colors.bg.primary,
            overflowY: 'auto',
          }}
        >
          {/* Mobile Tabs */}
          {isMobile && (
            <Box
              sx={{
                bgcolor: colors.bg.secondary,
                borderBottom: `1px solid ${colors.border.default}`,
              }}
            >
              {renderTabs('horizontal')}
              <Divider />
            </Box>
          )}

          {/* Page Content */}
          <Box
            sx={{
              width: '100%',
              maxWidth: '1200px',
              mx: 'auto',
              px: { xs: 2, sm: 4 },
              py: { xs: 3, md: 4 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>

      {/* 全局通知 */}
      <NotificationSnackbar
        open={notify.open}
        onClose={notify.hide}
        message={notify.message}
        severity={notify.severity}
      />
    </Box>
  );
}
