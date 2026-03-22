import { Box } from '@mui/material';

const ACTIVITY_DATA = [
  [4, 3, 4, 2, 1, 3, 4],
  [2, 4, 1, 3, 4, 2, 3],
  [1, 2, 3, 4, 1, 2, 4],
  [3, 1, 4, 2, 3, 4, 1],
];

const LEVELS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

function GitHubActivity() {
  return (
    <Box>
      <SectionTitle>GitHub Activity</SectionTitle>
      <Box
        sx={{
          display: 'flex',
          gap: '2px',
          flexWrap: 'wrap',
          maxWidth: 200,
        }}
      >
        {ACTIVITY_DATA.flat().map((level, i) => (
          <Box
            key={i}
            sx={{
              width: 12,
              height: 12,
              bgcolor: LEVELS[level],
              borderRadius: 0,
            }}
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

export default GitHubActivity;