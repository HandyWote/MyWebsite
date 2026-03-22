import { Box, Typography } from '@mui/material';
import { Github, Mail } from 'lucide-react';

const SOCIALS = [
  { icon: Github, label: 'GitHub', href: 'https://github.com/username' },
  { icon: Mail, label: 'Email', href: 'mailto:hello@example.com' },
];

function SocialLinks() {
  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Social</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {SOCIALS.map((social) => (
          <Box
            component="a"
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.875rem',
              transition: 'color 0.15s ease',
              '&:hover': {
                color: 'accent.blue',
              },
              '&:hover::before': {
                content: '"▸ "',
                color: 'accent.blue',
              },
            }}
          >
            <social.icon size={14} />
            {social.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function SectionTitle({ children }) {
  return (
    <Box
      component="div"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'text.muted',
        fontSize: '0.75rem',
        mb: 1.5,
        '&::after': {
          content: '""',
          flex: 1,
          height: 1,
          bgcolor: 'border.muted',
          ml: 1,
        }
      }}
    >
      ──[ {children} ]
    </Box>
  );
}

export default SocialLinks;
