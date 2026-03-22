import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getApiUrl, unwrapApiPayload } from '../config/api';
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

function Sidebar() {
  const [siteBlock, setSiteBlock] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSiteData = async () => {
    try {
      const res = await fetch(getApiUrl.siteBlocks());
      const data = await res.json();
      const blocks = unwrapApiPayload(data) || [];
      const homeBlock = blocks.find(b => b.name === 'home');
      setSiteBlock(homeBlock);
    } catch {
      // silent fail, use fallback values
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteData();
  }, []);

  // Extract data with fallbacks
  const avatarUrl = siteBlock?.avatar || '/avatar.jpg';
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
              src={loading ? '/avatar.jpg' : avatarUrl}
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
          <SocialLinks />
        </MotionDiv>

        {/* Education 区域 */}
        <MotionDiv variants={itemVariants}>
          <Education />
        </MotionDiv>

        {/* Tech Stack 区域 */}
        <MotionDiv variants={itemVariants}>
          <TechStack />
        </MotionDiv>

        {/* GitHub Activity 区域 */}
        <MotionDiv variants={itemVariants}>
          <GitHubActivity username={siteBlock?.github_calendar_url || 'HandyWote'} />
        </MotionDiv>
      </MotionDiv>
    </PixelContainer>
  );
}

export default Sidebar;
