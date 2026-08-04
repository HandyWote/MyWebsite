'use client';

import { Box } from '@mui/material';
import { GitHubCalendar } from 'react-github-calendar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const RECENT_WEEKS = 18;
const TABLET_WEEKS = 30;
const FULL_YEAR_WEEKS = 53;

function GitHubActivity({ username = 'HandyWote', compact = true }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const weeks = (compact || isMobile) ? RECENT_WEEKS : isTablet ? TABLET_WEEKS : FULL_YEAR_WEEKS;
  const visibleDays = weeks * 7;
  const transformData = (data) => data.slice(-visibleDays);
  const calendarMinWidth = (compact || isMobile) ? '214px' : isTablet ? '360px' : '720px';

  return (
    <Box sx={{ maxWidth: '100%', minWidth: 0 }}>
      <SectionTitle>GitHub Activity</SectionTitle>
      <Box
        data-testid="github-calendar-scroll"
        sx={{
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          display: 'flex',
          justifyContent: compact ? 'flex-start' : { xs: 'flex-start', md: 'center' },
          overflowX: compact ? 'auto' : 'hidden',
          overflowY: 'hidden',
          '& ::-webkit-scrollbar': {
            height: '6px',
          },
          '& ::-webkit-scrollbar-thumb': {
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
            minWidth: calendarMinWidth,
            maxWidth: '100%',
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
