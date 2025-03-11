import { useState, useEffect } from 'react';
import { Link } from 'react-scroll';
import { motion, AnimatePresence } from 'framer-motion';
import { AppBar, Toolbar, IconButton, Box, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const navItems = [
  { title: '首页', to: 'home' },
  { title: '关于我', to: 'about' },
  { title: '技能', to: 'skills' },
  { title: '项目', to: 'projects' },
  { title: '联系', to: 'contact' }
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      sx={{
        background: scrolled ? 'rgba(255, 255, 255, 0.7)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        boxShadow: scrolled ? '0 8px 32px 0 rgba(31, 38, 135, 0.07)' : 'none',
        transition: 'all 0.3s ease-in-out'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Link to="home" spy smooth offset={-70} duration={500}>
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
        </Link>

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
                    padding: '1rem'
                  }}
                >
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      spy
                      smooth
                      offset={-70}
                      duration={500}
                      onClick={() => setIsOpen(false)}
                    >
                      <Box
                        sx={{
                          py: 1,
                          textAlign: 'center',
                          cursor: 'pointer',
                          '&:hover': {
                            color: 'primary.main'
                          }
                        }}
                      >
                        {item.title}
                      </Box>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 4 }}>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                spy
                smooth
                offset={-70}
                duration={500}
              >
                <Box
                  sx={{
                    cursor: 'pointer',
                    position: 'relative',
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
              </Link>
            ))}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;