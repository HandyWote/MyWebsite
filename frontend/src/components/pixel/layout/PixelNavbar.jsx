import { useState } from 'react';
import { AppBar, Toolbar, Box, Tooltip, IconButton, Drawer, List, ListItemButton, ListItemText } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Menu as MenuIcon } from 'lucide-react';
import { colors, typography, spacing } from '../tokens';

/**
 * PixelNavbar - 终端风格导航栏
 */
export function PixelNavbar({ title = 'HandyWote', routes = [] }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const defaultRoutes = [
    { path: '/', label: 'Home' },
    { path: '/articles', label: 'Articles' },
  ];

  const navRoutes = routes.length > 0 ? routes : defaultRoutes;

  const handleNavClick = () => setMobileOpen(false);

  return (
    <>
    <AppBar position="sticky">
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '56px !important',
          px: { xs: 2, sm: 4 },
        }}
      >
        {/* Logo */}
        <Box
          component={Link}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: colors.text.primary,
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.lg,
            fontWeight: 600,
            '&:hover': {
              color: colors.accent.blue,
            },
          }}
        >
          <Box
            component="span"
            sx={{
              color: colors.accent.blue,
              mr: 0.5,
            }}
          >
            ▌
          </Box>
          {title}
          <Box
            component="span"
            sx={{
              color: colors.accent.blue,
              animation: 'blink 1s infinite',
              ml: 0.5,
            }}
          >
            _
          </Box>
        </Box>

        {/* 桌面端导航 */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          {navRoutes.map((route) => (
            <Box
              key={route.path}
              component={Link}
              to={route.path}
              sx={{
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize.sm,
                color: location.pathname === route.path
                  ? colors.accent.blue
                  : colors.text.secondary,
                textDecoration: 'none',
                padding: `${spacing.xs} ${spacing.sm}`,
                borderBottom: location.pathname === route.path
                  ? `2px solid ${colors.accent.blue}`
                  : '2px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: colors.accent.blue,
                  borderBottomColor: colors.accent.blue,
                },
              }}
            >
              {route.label}
            </Box>
          ))}

          {/* Admin Link */}
          <Tooltip title="Admin" arrow>
            <Box
              component={Link}
              to="/admin"
              sx={{
                color: colors.text.muted,
                display: 'flex',
                alignItems: 'center',
                '&:hover': {
                  color: colors.accent.blue,
                },
              }}
            >
              <Settings size={18} />
            </Box>
          </Tooltip>
        </Box>

        {/* 移动端汉堡按钮 */}
        <IconButton
          sx={{ display: { xs: 'flex', sm: 'none' }, color: colors.text.primary }}
          onClick={() => setMobileOpen(true)}
          aria-label="打开菜单"
        >
          <MenuIcon size={20} />
        </IconButton>
      </Toolbar>
    </AppBar>

    {/* 移动端抽屉菜单 */}
    <Drawer
      anchor="right"
      open={mobileOpen}
      onClose={() => setMobileOpen(false)}
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          width: 240,
        },
      }}
    >
      <List>
        {navRoutes.map((route) => (
          <ListItemButton
            key={route.path}
            component={Link}
            to={route.path}
            selected={location.pathname === route.path}
            onClick={handleNavClick}
            sx={{
              fontFamily: typography.fontFamily.mono,
              color: location.pathname === route.path
                ? colors.accent.blue
                : colors.text.primary,
            }}
          >
            <ListItemText primary={route.label} />
          </ListItemButton>
        ))}
        <ListItemButton
          component={Link}
          to="/admin"
          onClick={handleNavClick}
        >
          <Settings size={18} style={{ marginRight: 12, color: colors.text.muted }} />
          <ListItemText primary="Admin" />
        </ListItemButton>
      </List>
    </Drawer>
    </>
  );
}

export default PixelNavbar;