// AdminLayout组件 - Terminal Aesthetics 风格
import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Tabs, Tab, Button, useMediaQuery, Divider } from '@mui/material';
import { FileText, MessageSquare, User, Settings, Image, LayoutDashboard, LogOut } from 'lucide-react';
import { verifyToken, clearAuth, saveRedirectPath } from '../utils/auth';
import { colors, typography, spacing } from '../../components/pixel/tokens';

const tabList = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Articles', path: '/admin/articles', icon: FileText },
  { label: 'Comments', path: '/admin/comments', icon: MessageSquare },
  { label: 'Contacts', path: '/admin/contacts', icon: User },
  { label: 'Skills', path: '/admin/skills', icon: Settings },
  { label: 'Avatars', path: '/admin/avatars', icon: Image },
  { label: 'Content', path: '/admin/content', icon: FileText },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:900px)');
  const tabValue = tabList.findIndex(tab => location.pathname === tab.path) ?? 0;

  useEffect(() => {
    const checkTokenPeriodically = async () => {
      const result = await verifyToken();
      if (!result.valid) {
        clearAuth();
        saveRedirectPath(location.pathname);
        navigate('/admin/login', {
          state: { message: '登录已过期，请重新登录' },
          replace: true
        });
      }
    };

    checkTokenPeriodically();
    const interval = setInterval(checkTokenPeriodically, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate, location.pathname]);

  const handleTabChange = (e, idx) => {
    navigate(tabList[idx].path);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/admin/login', { replace: true });
  };

  const renderTabs = (orientation = 'vertical') => (
    <Tabs
      orientation={orientation}
      value={tabValue === -1 ? 0 : tabValue}
      onChange={handleTabChange}
      variant="scrollable"
      allowScrollButtonsMobile
      TabIndicatorProps={{
        sx: orientation === 'vertical'
          ? { left: 0, width: 3, bgcolor: 'primary.main' }
          : { height: 3 }
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
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogOut size={16} />}
            sx={{
              fontFamily: typography.fontFamily.mono,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              '&:hover': {
                color: colors.accent.red,
              },
            }}
          >
            Logout
          </Button>
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
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
