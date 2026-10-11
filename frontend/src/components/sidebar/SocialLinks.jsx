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

/** 裸邮箱形态：无 scheme 且含 @（如 handy@handywote.top）；域名不强制含点，user@localhost 等也算合法。 */
const looksLikeEmail = (value) =>
  typeof value === 'string' && !value.includes(':') && /^[^@\s]+@[^@\s]+$/.test(value);

/**
 * 地址归一化：后台配置可能把裸邮箱直接填进 href（issue #4），
 * 无 scheme 时浏览器会当站内相对路径导致 404。
 * 邮箱形态（含 @ 或 type=email）自动补 mailto:，http(s)/mailto/tel 原样。
 */
const buildHref = (item) => {
  const raw = item?.href || item?.value || '';
  if (!raw) {
    return '#';
  }
  if (item?.type === 'email' && !/^(https?|mailto|tel):/i.test(raw)) {
    return `mailto:${raw}`;
  }
  if (looksLikeEmail(raw)) {
    return `mailto:${raw}`;
  }
  return raw;
};

/** 邮件/电话是协议动作不是网页，不该开新标签页。 */
const isExternalWebLink = (href) => /^https?:/i.test(href);

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
          const href = buildHref(social);
          return (
          <Box
            component="a"
            key={`${social.type || 'other'}-${label}`}
            href={href}
            target={isExternalWebLink(href) ? '_blank' : undefined}
            rel={isExternalWebLink(href) ? 'noopener noreferrer' : undefined}
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
