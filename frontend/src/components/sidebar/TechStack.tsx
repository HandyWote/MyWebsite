import { Box } from '@mui/material';
import PixelChip from '../pixel/ui/PixelChip';

function TechStack({ items = [] }) {
  const techStackList = items || [];

  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Tech Stack</SectionTitle>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {techStackList.length === 0 && (
          <Box
            component="div"
            sx={{ color: 'text.muted', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}
          >
            (未配置)
          </Box>
        )}
        {techStackList.map((tech) => (
          <PixelChip
            key={typeof tech === 'string' ? tech : tech.name}
            label={typeof tech === 'string' ? tech : tech.name}
            size="small"
          />
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
