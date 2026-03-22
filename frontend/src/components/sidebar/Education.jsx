import { Box, Typography } from '@mui/material';

const EDUCATION = [
  { school: '北京大学', period: '2022-2026' },
];

function Education() {
  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Education</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {EDUCATION.map((edu) => (
          <Box
            key={edu.school}
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

export default Education;