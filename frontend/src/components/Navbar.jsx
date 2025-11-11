// 导入必要的React hooks和组件
import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';  // 用于路由导航
import { Link as ScrollLink } from 'react-scroll';  // 用于实现平滑滚动
import { motion, AnimatePresence } from 'framer-motion';  // 用于添加动画效果
import { AppBar, Toolbar, IconButton, Box, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

// 定义导航项配置
const navItems = [
  { title: '首页', to: 'home', href: '/' },
  { title: '关于我', to: 'about', href: '/#about' },
  { title: '技能', to: 'skills', href: '/#skills' },
  { title: '联系', to: 'contact', href: '/#contact' },
  { title: '项目', to: 'projects', href: '/#projects' },
  { title: '文章', to: 'articles', href: '/articles' }
];

/**
 * Navbar组件 - 响应式导航栏
 * 实现了以下功能：
 * 1. 响应式设计：在移动端显示汉堡菜单
 * 2. 滚动检测：根据滚动位置改变导航栏样式
 * 3. 平滑滚动：点击导航项平滑滚动到对应区域
 * 4. 动画效果：使用framer-motion实现菜单动画
 */
const Navbar = () => {
  // 状态管理
  const [isOpen, setIsOpen] = useState(false);  // 控制移动端菜单的开关状态
  const [scrolled, setScrolled] = useState(false);  // 追踪页面滚动状态
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));  // 响应式断点检测

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);  // 当滚动超过50px时更新状态
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);  // 清理事件监听
  }, []);

  // 定义菜单动画变体
  const menuVariants = {
    closed: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2
      }
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <AppBar
      position="fixed"
      color="transparent"
      sx={{
        background: scrolled ? 'rgba(255, 255, 255, 0.7)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        boxShadow: scrolled ? '0 8px 32px 0 rgba(31, 38, 135, 0.07)' : 'none',
        transition: 'all 0.3s ease-in-out'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Box
            component="span"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              color: theme.palette.text.primary
            }}
          >
            HandyWote
          </Box>
        </RouterLink>

        {isMobile ? (
          <>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  variants={menuVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    padding: '1rem',
                    color: theme.palette.text.primary
                  }}
                >
                  {navItems.map((item) => (
                    <RouterLink
                      key={item.to}
                      to={item.href}
                      style={{ textDecoration: 'none', color: theme.palette.text.primary }}
                      onClick={() => {
                        setIsOpen(false);
                        // 如果是页面内锚点，执行平滑滚动
                        if (item.href.startsWith('/#')) {
                          setTimeout(() => {
                            const element = document.getElementById(item.to);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 100);
                        }
                      }}
                    >
                      <Box
                        sx={{
                          py: 1,
                          textAlign: 'center',
                          cursor: 'pointer',
                          color: theme.palette.text.primary,
                          '&:hover': {
                            color: 'primary.main'
                          }
                        }}
                      >
                        {item.title}
                      </Box>
                    </RouterLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 4 }}>
            {navItems.map((item) => (
              <RouterLink
                key={item.to}
                to={item.href}
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={(e) => {
                  // 如果是页面内锚点，执行平滑滚动
                  if (item.href.startsWith('/#')) {
                    e.preventDefault();
                    const element = document.getElementById(item.to);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }
                }}
              >
                <Box
                  sx={{
                    cursor: 'pointer',
                    position: 'relative',
                    color: 'text.primary',
                    '&:hover': {
                      color: 'primary.main'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      width: '0%',
                      height: '2px',
                      bottom: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'primary.main',
                      transition: 'width 0.3s ease-in-out'
                    },
                    '&:hover::after': {
                      width: '100%'
                    }
                  }}
                >
                  {item.title}
                </Box>
              </RouterLink>
            ))}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
