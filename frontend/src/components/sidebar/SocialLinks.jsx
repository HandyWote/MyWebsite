import { Box, Typography } from '@mui/material';
import { Github, Mail, MessageCircle, Phone, Link as LinkIcon } from 'lucide-react';

const iconMap = {
  github: Github,
  email: Mail,
  wechat: MessageCircle,
  qq: MessageCircle,
  phone: Phone,
  other: LinkIcon,
};

const buildHref = (item) => {
  if (item?.href) {
    return item.href;
  }
  if (item?.type === 'email' && item?.value) {
    return `mailto:${item.value}`;
  }
  return item?.value || '#';
};

function SocialLinks({ links = [] }) {
  const list = links || [];

  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Social</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {list.length === 0 && (
          <Typography
            component="div"
            sx={{ color: 'text.muted', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}
          >
            (未配置)
          </Typography>
        )}
        {list.map((social) => {
          const Icon = iconMap[social.type] || iconMap.other;
          const label = social.label || social.value || 'Link';
          return (
          <Box
            component="a"
            key={`${social.type || 'other'}-${label}`}
            href={buildHref(social)}
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
            <Icon size={14} />
            {label}
          </Box>
          );
        })}
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
