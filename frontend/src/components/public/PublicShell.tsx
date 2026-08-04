import Link from 'next/link';
import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { TerminalCommandBar } from './TerminalCommandBar';

const items = [
  { label: 'articles', href: '/articles' },
  { label: 'projects', href: '/projects' },
  { label: 'about', href: '/' },
];

export function PublicShell({ activePath, children }: { activePath: string; children: ReactNode }) {
  return (
    <Box sx={{ height: 'var(--public-viewport-height)', display: 'grid', gridTemplateRows: 'minmax(0, 1fr) auto', border: 1, borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px minmax(0, 1fr)' }, minHeight: 0 }}>
        <Box component="aside" sx={{ display: { xs: 'none', md: 'block' }, p: 1.5, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
          <Box sx={{ color: 'text.disabled', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', mb: 1.25 }}>explorer</Box>
          {items.map((item) => {
            const active = item.href === '/' ? activePath === '/' : activePath.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="public-shell-link">
                <Box sx={{ display: 'grid', gridTemplateColumns: '16px 1fr', py: 0.75, color: active ? 'primary.main' : 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                  <span>{active ? '▸' : ''}</span><span>{item.label}</span>
                </Box>
              </Link>
            );
          })}
        </Box>
        <Box component="main" sx={{ minWidth: 0, minHeight: 0, overflow: 'auto' }}>
          <Box sx={{ minHeight: 34, px: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.disabled', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>
            <span>~/app{activePath}/</span><span>NORMAL</span>
          </Box>
          <Box sx={{ p: { xs: 1, sm: 2.5 } }}>{children}</Box>
        </Box>
      </Box>
      <TerminalCommandBar cwd={`~/app${activePath === '/' ? '' : activePath}`} commands={['cd articles/', 'cd projects/', 'cd about/', 'help']} />
    </Box>
  );
}
