import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import type { EducationItem } from '@/api/types';

export interface EducationProps {
  /** 侧边栏 sidebar 块的 education 数组；空数组渲染「(未配置)」。 */
  items?: EducationItem[];
}

function Education({ items = [] }: EducationProps) {
  const educationList = items || [];

  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Education</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {educationList.length === 0 && (
          <Typography
            component="div"
            sx={{ color: 'text.muted', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}
          >
            (未配置)
          </Typography>
        )}
        {educationList.map((edu) => (
          <Box
            key={`${edu.school}-${edu.period}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.875rem',
              color: 'text.secondary',
              '&::before': { content: '"▸ "', color: 'accent.green' },
            }}
          >
            {edu.school} ({edu.period})
          </Box>
        ))}
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

export default Education;
