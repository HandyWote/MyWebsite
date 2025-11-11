import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Tabs, Tab, Button, useMediaQuery, Divider } from '@mui/material';
import { verifyToken, clearAuth, saveRedirectPath } from '../utils/auth';

const tabList = [
  { label: '内容管理', path: '/admin/content' },
  { label: '技能管理', path: '/admin/skills' },
  { label: '联系方式', path: '/admin/contacts' },
  { label: '头像管理', path: '/admin/avatars' },
  { label: '文章管理', path: '/admin/articles' },
  { label: '评论管理', path: '/admin/comments' },
  { label: '数据管理', path: '/admin/data' }
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:900px)');
  const tabValue = tabList.findIndex(tab => location.pathname.startsWith(tab.path)) ?? 0;

  // 定期验证token有效性
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

    // 立即检查一次
    checkTokenPeriodically();

    // 每5分钟检查一次token有效性
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

  const renderTabs = (orientation = 'vertical', extraSx = {}) => (
    <Tabs
      orientation={orientation}
      value={tabValue === -1 ? 0 : tabValue}
      onChange={handleTabChange}
      variant="scrollable"
      allowScrollButtonsMobile
      sx={extraSx}
      TabIndicatorProps={{
        sx: orientation === 'vertical' ? { left: 0, width: 4, bgcolor: 'primary.main' } : { height: 3, borderRadius: 3 }
      }}
    >
      {tabList.map(tab => (
        <Tab
          key={tab.path}
          label={tab.label}
          sx={{
            px: orientation === 'vertical' ? 3 : 2,
            py: orientation === 'vertical' ? 2 : 1,
            alignItems: orientation === 'vertical' ? 'flex-start' : 'center',
            fontWeight: 500,
            fontSize: 16,
            color: '#333',
            '&.Mui-selected': {
              color: 'primary.main',
              background: orientation === 'vertical' ? 'rgba(25,118,210,0.08)' : 'transparent'
            }
          }}
        />
      ))}
    </Tabs>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <AppBar position="static" color="primary" sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: 2 }}>管理后台</Typography>
          <Button color="inherit" onClick={handleLogout}>退出登录</Button>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: 'calc(100vh - 64px)',
          width: '100%',
          background: '#f5f7fa'
        }}
      >
        {!isMobile && (
          <Box
            sx={{
              width: 220,
              bgcolor: 'white',
              borderRight: '1px solid #eee',
              pt: 2,
              boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
              minHeight: 'calc(100vh - 64px)'
            }}
          >
            {renderTabs('vertical', { height: '100%' })}
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            width: '100%',
            minHeight: 'calc(100vh - 64px)',
            background: '#f5f7fa',
            overflowY: 'auto'
          }}
        >
          {isMobile && (
            <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #eee' }}>
              {renderTabs('horizontal', {
                px: 2,
                '& .MuiTabs-flexContainer': {
                  gap: 0.5
                }
              })}
              <Divider />
            </Box>
          )}

          <Box
            sx={{
              width: '100%',
              maxWidth: '1200px',
              mx: 'auto',
              px: { xs: 2, sm: 4 },
              py: { xs: 3, md: 4 }
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
