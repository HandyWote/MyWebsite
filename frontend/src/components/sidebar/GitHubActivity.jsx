import { Box, Link as MuiLink } from '@mui/material';
import { GitHubCalendar } from 'react-github-calendar';

const RECENT_WEEKS = 18;
const RECENT_DAYS = RECENT_WEEKS * 7;

function GitHubActivity({ username = 'HandyWote' }) {
  const fullCalendarUrl = `https://github.com/${username}`;
  const transformData = (data) => data.slice(-RECENT_DAYS);

  return (
    <Box>
      <SectionTitle>GitHub Activity</SectionTitle>
      <Box
        data-testid="github-calendar-scroll"
        sx={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          '& ::-webkit-scrollbar': {
            height: '6px',
          },
          '& ::-webkit-scrollbar-track': {
            background: 'var(--bg-secondary)',
          },
          '& ::-webkit-scrollbar-thumb': {
            background: 'var(--border-default)',
            borderRadius: '3px',
          },
        }}
      >
        <GitHubCalendar
          username={username}
          transformData={transformData}
          blockSize={10}
          blockMargin={2}
          showWeekdayLabels={false}
          showMonthLabels={false}
          showColorLegend={false}
          showTotalCount={false}
          colorScheme="dark"
          style={{
            minWidth: '214px',
            fontFamily: 'var(--font-mono)',
          }}
        />
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
