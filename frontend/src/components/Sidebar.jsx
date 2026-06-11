import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getApiUrl, unwrapApiPayload } from '../config/api';
import { getBlockContent } from '../config/siteBlocks';
import PixelAvatar from './pixel/ui/PixelAvatar';
import PixelContainer from './pixel/layout/PixelContainer';
import SocialLinks from './sidebar/SocialLinks';
import Education from './sidebar/Education';
import TechStack from './sidebar/TechStack';
import GitHubActivity from './sidebar/GitHubActivity';

const MotionDiv = motion.div;

const sidebarVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};
import { normalizeGitHubUsername } from '../utils/github';

const AVATAR_FALLBACK = `${import.meta.env.BASE_URL}avatar.webp`;

function Sidebar() {
  const [siteBlock, setSiteBlock] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_FALLBACK);
  const [sidebarBlock, setSidebarBlock] = useState({
    social_links: [],
    education: [],
    tech_stack: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchSiteData = async () => {
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
      const homeBlock = blocks.find(b => b.name === 'home');
      const sidebarContent = getBlockContent(blocks, 'sidebar');
      const currentAvatar = avatars.find((avatar) => avatar.is_current);
      setSiteBlock(homeBlock);
      setSidebarBlock(sidebarContent);
      setAvatarUrl(currentAvatar ? getApiUrl.avatarFile(currentAvatar.filename) : AVATAR_FALLBACK);
    } catch {
      // silent fail, use fallback values
      setAvatarUrl(AVATAR_FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteData();
  }, []);

  // Extract data with fallbacks
  const siteTitle = siteBlock?.title || 'name@host';
  const siteSubtitle = siteBlock?.subtitle || 'slogan text';

  return (
    <PixelContainer>
      <MotionDiv
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 头像 + 名字区域 */}
        <MotionDiv variants={itemVariants}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <PixelAvatar
              src={loading ? AVATAR_FALLBACK : avatarUrl}
              alt="avatar"
              sx={{ width: 64, height: 64 }}
            />
            <Box>
              <Typography
                component="div"
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'text.primary',
                  fontWeight: 'bold',
                }}
              >
                {loading ? 'loading...' : siteTitle}
              </Typography>
              <Typography
                component="div"
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                }}
              >
                $ {loading ? 'fetching data...' : siteSubtitle}
                <Box
                  component="span"
                  className="cursor-blink"
                  sx={{
                    display: 'inline-block',
                    width: 8,
                    height: 16,
                    bgcolor: 'accent.blue',
                    ml: 0.5,
                  }}
                />
              </Typography>
            </Box>
          </Box>
        </MotionDiv>

        {/* Social 区域 */}
        <MotionDiv variants={itemVariants}>
          <SocialLinks links={sidebarBlock.social_links} />
        </MotionDiv>

        {/* Education 区域 */}
        <MotionDiv variants={itemVariants}>
          <Education items={sidebarBlock.education} />
        </MotionDiv>

        {/* Tech Stack 区域 */}
        <MotionDiv variants={itemVariants}>
          <TechStack items={sidebarBlock.tech_stack} />
        </MotionDiv>

        {/* GitHub Activity 区域 */}
        <MotionDiv variants={itemVariants}>
          <GitHubActivity username={normalizeGitHubUsername(siteBlock?.github_calendar_url)} />
        </MotionDiv>
      </MotionDiv>
    </PixelContainer>
  );
}

export default Sidebar;
