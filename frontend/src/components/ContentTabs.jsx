import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const MotionDiv = motion.div;

const TABS = [
  { id: 'articles', label: '~/articles', path: 'articles' },
  { id: 'projects', label: '~/projects', path: 'projects' },
];

function ContentTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.startsWith('/projects') ? 'projects' : 'articles';

  return (
    <Box sx={{ p: 3 }}>
      {/* Tab 切换栏 */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          borderBottom: 1,
          borderColor: 'border.default',
          pb: 1,
          mb: 3,
        }}
      >
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => navigate(`/${tab.path}`)}
          />
        ))}
      </Box>

      {/* 内容区域 - 带边框 */}
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'border.default',
          p: 3,
          borderRadius: 0,
        }}
      >
        <MotionDiv
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </MotionDiv>
      </Box>
    </Box>
  );
}

function TabButton({ tab, isActive, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      data-active={isActive ? 'true' : 'false'}
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: isActive ? 'rgba(88, 166, 255, 0.22)' : 'transparent',
        color: isActive ? '#79b8ff' : 'text.primary',
        fontWeight: isActive ? 'bold' : 'normal',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '1rem',
        px: 2,
        py: 1,
        border: 1,
        borderColor: isActive ? 'accent.blue' : 'border.muted',
        borderBottom: 'none',
        transition: 'all 0.15s ease',
        textShadow: isActive ? '0 0 10px rgba(88, 166, 255, 0.35)' : 'none',
        '&:hover': {
          bgcolor: isActive ? 'rgba(88, 166, 255, 0.28)' : 'rgba(255, 255, 255, 0.05)',
        },
      }}
    >
      <Box component="span" sx={{ color: 'text.muted' }}>
        {isActive ? '▸' : '○'}
      </Box>
      <Typography
        component="span"
        sx={{
          fontFamily: 'inherit',
          color: 'inherit',
        }}
      >
        {tab.label}
      </Typography>
      {isActive && (
        <Box
          component="span"
          sx={{
            color: 'accent.blue',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {' '}$./
        </Box>
      )}
    </Box>
  );
}

export default ContentTabs;
