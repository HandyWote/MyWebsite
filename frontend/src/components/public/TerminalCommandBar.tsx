'use client';

import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState, type KeyboardEvent } from 'react';

const routeCommands: Record<string, string> = {
  'cd articles/': '/articles',
  'cd articles': '/articles',
  'cd projects/': '/projects',
  'cd projects': '/projects',
  'cd about/': '/',
  'cd about': '/',
  home: '/',
};

export function TerminalCommandBar({ cwd, commands }: { cwd: string; commands: string[] }) {
  const router = useRouter();
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const execute = () => {
    const normalized = command.trim().replace(/\s+/g, ' ');
    setCommand('');
    if (routeCommands[normalized]) {
      router.push(routeCommands[normalized]);
      return;
    }
    if (normalized === 'help') {
      setOutput(commands.join('  |  '));
      return;
    }
    setOutput(normalized ? `command not found: ${normalized}` : '');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') execute();
  };
  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 1.5, py: 1 }}>
      {output && <Box sx={{ mb: 0.5, color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>{output}</Box>}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box component="label" htmlFor={`command-${cwd}`} sx={{ color: 'primary.main', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }}>
          Guess@{cwd} $
        </Box>
        <Box
          id={`command-${cwd}`}
          component="input"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Terminal command"
          sx={{ flex: 1, minWidth: 0, border: 0, outline: 0, bgcolor: 'transparent', color: 'text.primary', fontFamily: 'JetBrains Mono, monospace' }}
        />
      </Box>
    </Box>
  );
}
