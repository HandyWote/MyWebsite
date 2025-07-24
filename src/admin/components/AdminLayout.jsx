import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Tabs, Tab, Button, useMediaQuery } from '@mui/material';

const tabList = [
  { label: '简介管理', path: '/admin/content' },
  { label: '技能管理', path: '/admin/skills' },
  { label: '联系方式', path: '/admin/contacts' },
  { label: '头像管理', path: '/admin/avatars' },
  { label: '文章管理', path: '/admin/articles' },
  { label: '导入导出', path: '/admin/data' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:900px)');
  const currentTab = tabList.findIndex(tab => location.pathname.startsWith(tab.path));

  const handleTabChange = (e, idx) => {
    navigate(tabList[idx].path);
  };

  const handleLogout = () => {
    // TODO: 清除token
    navigate('/admin/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <AppBar position="static" color="primary" sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: 2 }}>管理后台</Typography>
          <Button color="inherit" onClick={handleLogout}>退出登录</Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)', width: '100vw', background: '#f5f7fa' }}>
        {/* 左侧菜单栏 */}
        {!isMobile && (
          <Box sx={{
            width: 200,
            bgcolor: 'white',
            borderRight: '1px solid #eee',
            pt: 2,
            boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
            minHeight: 'calc(100vh - 64px)'
          }}>
            <Tabs
              orientation="vertical"
              value={currentTab === -1 ? 0 : currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              sx={{ height: '100%' }}
              TabIndicatorProps={{ style: { background: '#1976d2', width: 4, left: 0 } }}
            >
              {tabList.map(tab => (
                <Tab key={tab.path} label={tab.label} sx={{
                  alignItems: 'flex-start',
                  px: 3,
                  py: 2,
                  fontWeight: 500,
                  fontSize: 16,
                  color: '#333',
                  '&.Mui-selected': {
                    color: '#1976d2',
                    background: 'rgba(25, 118, 210, 0.08)',
                    borderRadius: 0, // 直角
                  }
                }} />
              ))}
            </Tabs>
          </Box>
        )}
        {/* 右侧内容区，铺满剩余空间 */}
        <Box sx={{
          flex: 1,
          minHeight: 'calc(100vh - 64px)',
          background: '#f5f7fa',
          p: { xs: 2, sm: 4 },
          overflow: 'auto'
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout; 