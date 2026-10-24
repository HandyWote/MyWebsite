import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import {
  Github,
  Mail,
  MessageCircle,
  Phone,
  Link as LinkIcon,
  type LucideIcon,
} from 'lucide-react';
import type { SocialLink, SocialLinkType } from '@/api/types';

/**
 * 后台配置里可能残留的历史字段：早期表单用的是 `value` 而不是 `href`，
 * 因此前台读取时要两边都认（见下方 buildHref）。
 */
export type SocialLinkItem = SocialLink & { value?: string };

export interface SocialLinksProps {
  /** 侧边栏 sidebar 块的 social_links 数组；空数组渲染「(未配置)」。 */
  links?: SocialLinkItem[];
}

/** 图标表：键必须覆盖 SocialLinkType，新增类型时这里缺键会编译报错。 */
const iconMap = {
  github: Github,
  email: Mail,
  wechat: MessageCircle,
  qq: MessageCircle,
  phone: Phone,
  other: LinkIcon,
} satisfies Record<SocialLinkType, LucideIcon>;

const isIconKey = (value: unknown): value is SocialLinkType =>
  typeof value === 'string' && Object.hasOwn(iconMap, value);

/** 裸邮箱形态：无 scheme 且含 @（如 handy@handywote.top）；域名不强制含点，user@localhost 等也算合法。以 / 开头的是站内/协议相对路径（如 //host/@user、/@alice），不是邮箱。 */
const looksLikeEmail = (value: string): boolean =>
  !value.includes(':') && !value.startsWith('/') && /^[^@\s]+@[^@\s]+$/.test(value);

/**
 * 地址归一化：后台配置可能把裸邮箱直接填进 href（issue #4），
 * 无 scheme 时浏览器会当站内相对路径导致 404。
 * 邮箱形态（含 @ 或 type=email）自动补 mailto:，http(s)/mailto/tel 原样。
 */
const buildHref = (item: SocialLinkItem): string => {
  const raw = item.href || item.value || '';
  if (!raw) {
    return '#';
  }
  if (item.type === 'email' && !/^(https?|mailto|tel):/i.test(raw)) {
    return `mailto:${raw}`;
  }
  if (looksLikeEmail(raw)) {
    return `mailto:${raw}`;
  }
  return raw;
};

/** 邮件/电话是协议动作不是网页，不该开新标签页。 */
const isExternalWebLink = (href: string): boolean => /^https?:/i.test(href);

function SocialLinks({ links = [] }: SocialLinksProps) {
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
          const Icon = isIconKey(social.type) ? iconMap[social.type] : iconMap.other;
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

function SectionTitle({ children }: { children: ReactNode }) {
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
