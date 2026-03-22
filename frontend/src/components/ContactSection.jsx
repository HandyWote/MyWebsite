// ContactSection组件 - Terminal Aesthetics 风格
import { useState } from 'react';
import { Box, Snackbar } from '@mui/material';
import { iconMap } from '../utils/iconMap';
import { PixelContainer, PixelCard, PixelTypography, TerminalLine } from './pixel';

const ContactSection = ({ contacts, contactDescription }) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleCopy = (value) => {
    navigator.clipboard.writeText(value);
    setSnackbarOpen(true);
  };

  return (
    <PixelContainer section id="contact">
      <TerminalLine>ping contact</TerminalLine>

      <PixelCard title="联系方式" accentLine sx={{ mt: 3 }}>
        {contactDescription && (
          <PixelTypography sx={{ mb: 2, color: 'text.secondary' }}>
            {contactDescription}
          </PixelTypography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {contacts.map((c) => (
            <Box
              key={c.id}
              onClick={() => handleCopy(c.value)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                p: 1.5,
                border: '1px dashed',
                borderColor: 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  borderStyle: 'solid',
                },
              }}
            >
              <Box sx={{ color: 'text.secondary', mr: 1.5, display: 'flex', alignItems: 'center' }}>
                {iconMap[c.type] || iconMap.other}
              </Box>
              <PixelTypography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}>
                {c.value}
              </PixelTypography>
            </Box>
          ))}
        </Box>
      </PixelCard>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={1500}
        onClose={() => setSnackbarOpen(false)}
        message="已复制到剪贴板"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </PixelContainer>
  );
};

export default ContactSection;
