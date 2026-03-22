import { Box, Drawer, IconButton, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Menu as MenuIcon } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';

function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // 断点尺寸
  const sidebarWidth = isMobile ? 0 : isTablet ? 200 : 280;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 移动端顶部导航栏 */}
      {isMobile && (
        <Box
          component="nav"
          sx={{
            display: { xs: 'flex', sm: 'none' },
            alignItems: 'center',
            gap: 2,
            width: '100%',
            height: 56,
            px: 2,
            bgcolor: 'bg.secondary',
            borderBottom: 1,
            borderColor: 'border.default',
          }}
        >
          <IconButton onClick={handleDrawerToggle} sx={{ color: 'text.primary' }}>
            <MenuIcon size={20} />
          </IconButton>
          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.primary' }}>
            ~/handywote
          </Typography>
        </Box>
      )}

      {/* 移动端抽屉式侧边栏 */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              bgcolor: 'bg.primary',
              borderRight: 1,
              borderColor: 'border.default',
            },
          }}
        >
          <Sidebar />
        </Drawer>
      )}

      {/* 固定侧边栏 - 桌面端 */}
      {!isMobile && (
        <Box
          component="aside"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            position: 'fixed',
            top: 12,
            bottom: 12,
            height: 'auto',
            overflow: 'auto',
          }}
        >
          <Sidebar />
        </Box>
      )}

      {/* 主内容区 */}
      <Box
        component="main"
        sx={{
          ml: isMobile ? 0 : `${sidebarWidth}px`,
          flex: 1,
          minHeight: isMobile ? '100vh' : 'calc(100vh - 24px)',
          width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default MainLayout;
