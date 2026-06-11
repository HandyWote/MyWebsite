import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { uniqueCommands } from './utils';

const normalizeCommand = (value) => value.trim().replace(/\s+/g, ' ');
const HELP_LINES = [
  'Available commands:',
  '  cd articles/      open article list',
  '  cd projects/      open project list',
  '  cd about/         return welcome page',
  '  open latest       open latest article',
  '  open <article>    open article by id/title',
  '  open prev         open previous article',
  '  open next         open next article',
  '  exit              leave current article buffer',
  '  clear             clear terminal output',
  '  help              show this help',
];

function TerminalCommandBar({
  cwd = '~/app',
  commands = [],
  prompt = 'Guess',
  onCommand,
}) {
  const navigate = useNavigate();
  const [command, setCommand] = useState('');
  const [outputLines, setOutputLines] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const availableCommands = uniqueCommands(commands);
  const normalizedInput = command.trim().toLowerCase();
  const candidates = normalizedInput
    ? availableCommands.filter((item) => item.toLowerCase().includes(normalizedInput))
    : [];
  const visibleCandidates = candidates.slice(0, 8);

  const executeCommand = (rawCommand) => {
    const nextCommand = normalizeCommand(rawCommand);
    if (!nextCommand) return;

    setCommand('');
    setActiveIndex(0);

    if (onCommand?.(nextCommand) === true) {
      return;
    }

    if (nextCommand === 'cd articles/' || nextCommand === 'cd articles') {
      navigate('/articles');
      return;
    }

    if (nextCommand === 'cd projects/' || nextCommand === 'cd projects') {
      navigate('/projects');
      return;
    }

    if (
      nextCommand === 'cd about/' ||
      nextCommand === 'cd about' ||
      nextCommand === 'home' ||
      nextCommand === 'about'
    ) {
      navigate('/');
      return;
    }

    if (nextCommand === 'exit' || nextCommand === 'back') {
      navigate('/articles');
      return;
    }

    if (nextCommand === 'open latest') {
      navigate('/articles');
      setOutputLines(['select an article from the list']);
      return;
    }

    if (nextCommand === 'clear') {
      setOutputLines([]);
      return;
    }

    if (nextCommand === 'help') {
      setOutputLines(HELP_LINES);
      return;
    }

    setOutputLines([`command not found: ${nextCommand}`]);
  };

  const completeCommand = () => {
    if (visibleCandidates.length === 0) return;
    setCommand(visibleCandidates[activeIndex] || visibleCandidates[0]);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      completeCommand();
      return;
    }

    if (event.key === 'ArrowDown' && visibleCandidates.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % visibleCandidates.length);
      return;
    }

    if (event.key === 'ArrowUp' && visibleCandidates.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + visibleCandidates.length) % visibleCandidates.length);
      return;
    }

    if (event.key === 'Enter') {
      executeCommand(visibleCandidates[activeIndex] || command);
    }
  };

  return (
    <Box
      onDoubleClick={(event) => event.stopPropagation()}
      sx={{
        borderTop: 1,
        borderColor: 'border.default',
        bgcolor: 'bg.secondary',
        px: { xs: 1, sm: 1.5 },
        py: 1,
        flexShrink: 0,
      }}
    >
      {outputLines.length > 0 && (
        <Box
          sx={{
            mb: 0.75,
            maxHeight: { xs: '24dvh', sm: '32vh' },
            overflow: 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            color: 'text.secondary',
            fontSize: '0.75rem',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
          }}
        >
          {outputLines.map((line) => (
            <Box component="div" key={line}>
              {line}
            </Box>
          ))}
        </Box>
      )}

      {visibleCandidates.length > 0 && (
        <Box
          role="listbox"
          aria-label="Command suggestions"
          sx={{
            mb: 0.75,
            maxHeight: { xs: '28dvh', sm: '36vh' },
            overflow: 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem',
            lineHeight: 1.45,
            color: 'text.secondary',
          }}
        >
          {visibleCandidates.map((candidate, index) => (
            <Box
              component="div"
              role="option"
              aria-selected={index === activeIndex}
              key={candidate}
              onMouseDown={(event) => {
                event.preventDefault();
                executeCommand(candidate);
              }}
              sx={{
                display: 'grid',
                gridTemplateColumns: '16px minmax(0, 1fr)',
                cursor: 'default',
                color: index === activeIndex ? 'text.primary' : 'text.secondary',
                bgcolor: index === activeIndex ? 'rgba(88, 166, 255, 0.12)' : 'transparent',
                px: 0.25,
              }}
            >
              <Box component="span" sx={{ color: index === activeIndex ? 'accent.blue' : 'text.muted' }}>
                {index === activeIndex ? '▸' : ''}
              </Box>
              <Box component="span">{candidate}</Box>
            </Box>
          ))}
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'auto minmax(0, 1fr)' },
          alignItems: 'center',
          gap: { xs: 0.5, sm: 1 },
          minWidth: 0,
        }}
      >
        <Typography
          component="label"
          htmlFor="terminal-command-input"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: 'accent.blue',
            fontSize: '0.8125rem',
            whiteSpace: { xs: 'normal', sm: 'nowrap' },
            overflowWrap: 'anywhere',
          }}
        >
          {prompt}@{cwd} $
        </Typography>
        <Box
          id="terminal-command-input"
          component="input"
          value={command}
          onChange={(event) => {
            setCommand(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Terminal command"
          autoComplete="off"
          spellCheck={false}
          sx={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 'none',
            bgcolor: 'transparent',
            color: 'text.primary',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.8125rem',
          }}
        />
      </Box>
    </Box>
  );
}

export default TerminalCommandBar;
