import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getApiUrl, unwrapApiPayload } from '../../config/api';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '../../config/siteBlocks';
import PixelAvatar from '../pixel/ui/PixelAvatar';
import SocialLinks from '../sidebar/SocialLinks';
import Education from '../sidebar/Education';
import TechStack from '../sidebar/TechStack';
import GitHubActivity from '../sidebar/GitHubActivity';
import TerminalCommandBar from './TerminalCommandBar';

const AVATAR_FALLBACK = `${import.meta.env.BASE_URL}avatar.webp`;

import { normalizeGitHubUsername } from '../../utils/github';

function TerminalWelcome() {
  const navigate = useNavigate();
  const [homeBlock, setHomeBlock] = useState(SITE_BLOCK_DEFAULTS.home);
  const [sidebarBlock, setSidebarBlock] = useState(SITE_BLOCK_DEFAULTS.sidebar);
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_FALLBACK);
  const [loading, setLoading] = useState(true);
  const lastTapAt = useRef(0);

  useEffect(() => {
    let ignore = false;

    const fetchProfile = async () => {
      try {
        const [siteBlocksRes, avatarsRes] = await Promise.all([
          fetch(getApiUrl.siteBlocks()),
          fetch(getApiUrl.avatars()),
        ]);
        const [siteBlocksData, avatarsData] = await Promise.all([
          siteBlocksRes.json(),
          avatarsRes.json(),
        ]);
        const blocks = unwrapApiPayload(siteBlocksData) || [];
        const avatars = unwrapApiPayload(avatarsData) || avatarsData?.avatars || [];
        const currentAvatar = avatars.find((avatar) => avatar.is_current);

        if (!ignore) {
          setHomeBlock(getBlockContent(blocks, 'home'));
          setSidebarBlock(getBlockContent(blocks, 'sidebar'));
          setAvatarUrl(currentAvatar ? getApiUrl.avatarFile(currentAvatar.filename) : AVATAR_FALLBACK);
        }
      } catch {
        if (!ignore) {
          setAvatarUrl(AVATAR_FALLBACK);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      ignore = true;
    };
  }, []);

  const siteTitle = loading ? 'loading...' : homeBlock.title;
  const siteSubtitle = loading ? 'fetching profile...' : homeBlock.subtitle;
  const username = normalizeGitHubUsername(homeBlock.github_calendar_url);
  const shouldIgnoreEnterGesture = (event) => event.target.closest('a, button, input, textarea, select');
  const handleWelcomeDoubleClick = (event) => {
    if (shouldIgnoreEnterGesture(event)) {
      return;
    }
    navigate('/articles');
  };
  const handleWelcomePointerUp = (event) => {
    if (event.pointerType !== 'touch' || shouldIgnoreEnterGesture(event)) {
      return;
    }

    const now = Date.now();
    if (now - lastTapAt.current < 320) {
      lastTapAt.current = 0;
      navigate('/articles');
      return;
    }

    lastTapAt.current = now;
  };

  return (
    <Box
      onDoubleClick={handleWelcomeDoubleClick}
      onPointerUp={handleWelcomePointerUp}
      sx={{
        height: { xs: 'calc(100dvh - 20px)', sm: 'calc(100vh - 24px)' },
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) auto',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'border.default',
        bgcolor: 'bg.primary',
      }}
    >
      <Box
        sx={{
          minHeight: 0,
          overflow: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'center',
          px: { xs: 1.25, sm: 4 },
          py: { xs: 2, sm: 5 },
        }}
      >
        <Box sx={{ width: 'min(100%, 820px)', maxWidth: '100%', minWidth: 0, textAlign: 'center' }}>
          <Typography
            component="div"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.muted',
              fontSize: '0.75rem',
              mb: 2,
            }}
          >
            ~/intro.md - double click to enter articles
          </Typography>

          <PixelAvatar
            src={loading ? AVATAR_FALLBACK : avatarUrl}
            alt="avatar"
            sx={{ width: { xs: 64, sm: 84 }, height: { xs: 64, sm: 84 }, mx: 'auto', mb: { xs: 1.5, sm: 2 } }}
          />

          <Typography
            component="h1"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.primary',
              fontSize: { xs: '1.875rem', sm: '2.5rem' },
              fontWeight: 700,
              lineHeight: 1.1,
              mb: 1,
            }}
          >
            {siteTitle}
          </Typography>

          <Typography
            component="div"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.secondary',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              mb: { xs: 2, sm: 3 },
            }}
          >
            $ {siteSubtitle}
            <Box
              component="span"
              className="cursor-blink"
              sx={{ display: 'inline-block', width: 8, height: 16, bgcolor: 'accent.blue', ml: 0.5 }}
            />
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: { xs: 1, sm: 1.75 },
              textAlign: 'center',
              justifyItems: 'center',
              '& > *': {
                mb: '0 !important',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
              },
              '& > * > div:first-of-type': {
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: 'text.muted',
                '&::first-letter': {
                  letterSpacing: 0,
                },
                '&::before': {
                  content: '""',
                },
                '&::after': {
                  display: 'none',
                },
              },
              '& > * > div:nth-of-type(2)': {
                justifyContent: 'center',
                alignItems: 'center',
              },
              '& a': {
                justifyContent: 'center',
              },
            }}
          >
            <SocialLinks links={sidebarBlock.social_links} />
            <Education items={sidebarBlock.education} />
            <TechStack items={sidebarBlock.tech_stack} />
            <GitHubActivity username={username} compact={false} />
          </Box>

          <Typography
            component="div"
            sx={{
              mt: { xs: 1.75, sm: 2.5 },
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.muted',
              fontSize: '0.75rem',
            }}
          >
            Double click anywhere, type a command, or click a hint below.
          </Typography>
        </Box>
      </Box>

      <TerminalCommandBar
        cwd="~/app"
        commands={['cd articles/', 'cd projects/', 'help']}
      />
    </Box>
  );
}

export default TerminalWelcome;
