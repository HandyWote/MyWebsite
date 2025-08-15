import React, { useState } from 'react';
import { Box, Typography, Tooltip, Snackbar } from '@mui/material';
import { iconMap } from './SocialIcons';

/**
 * 联系方式展示组件
 * 展示各种联系方式，支持点击复制功能
 */
const ContactSection = ({ contacts, contactDescription }) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const handleCopy = (value) => {
    navigator.clipboard.writeText(value);
    setSnackbarMsg('已复制到剪贴板');
    setSnackbarOpen(true);
  };

  return (
    <div id="contact" style={{ marginTop: '3rem', textAlign: 'center' }}>
      <Typography
        variant="h3"
        component="h2"
        gutterBottom
        sx={{ textAlign: 'center', mb: 4, fontSize: { xs: '2rem', sm: '3rem' } }}
      >
        联系方式
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
        {contactDescription || '如果您对我的工作感兴趣，或者想要了解更多信息，欢迎通过以下方式与我联系：'}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {contacts.map((c) => (
          <Tooltip title="点击复制" key={c.id} placement="top">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                p: 1.2,
                borderRadius: 2,
                minWidth: 260,
                fontSize: 16,
                bgcolor: 'rgba(255,255,255,0.08)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
              }}
              onClick={() => handleCopy(c.value)}
            >
              {iconMap[c.type] || iconMap.other}
              <span style={{ marginLeft: 12 }}>{c.value}</span>
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={1500}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </div>
  );
};

export default ContactSection;
