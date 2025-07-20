import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Tabs, Tab, Button, Drawer, useMediaQuery } from '@mui/material';

const tabList = [
  { label: '内容管理', path: '/admin/content' },
  { label: '技能管理', path: '/admin/skills' },
  { label: '联系方式', path: '/admin/contacts' },
  { label: '头像管理', path: '/admin/avatars' },
  { label: '文章管理', path: '/admin/articles' },
  { label: '操作日志', path: '/admin/logs' },
  { label: '回收站', path: '/admin/recycle-bin' },
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
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>管理后台</Typography>
          <Button color="inherit" onClick={handleLogout}>退出登录</Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        {!isMobile && (
          <Box sx={{ width: 180, bgcolor: 'white', borderRight: '1px solid #eee', pt: 2 }}>
            <Tabs
              orientation="vertical"
              value={currentTab === -1 ? 0 : currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              sx={{ height: '100%' }}
            >
              {tabList.map(tab => (
                <Tab key={tab.path} label={tab.label} />
              ))}
            </Tabs>
          </Box>
        )}
        <Box sx={{ flex: 1, p: { xs: 1, sm: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout; 