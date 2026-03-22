import { Box } from '@mui/material';
import PixelChip from '../pixel/ui/PixelChip';

const TECH_STACK = ['React', 'Go', 'TypeScript', 'Node.js', 'PostgreSQL'];

function TechStack() {
  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Tech Stack</SectionTitle>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {TECH_STACK.map((tech) => (
          <PixelChip key={tech} label={tech} size="small" />
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

export default TechStack;