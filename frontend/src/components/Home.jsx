// Home组件 - Terminal Aesthetics 个人主页
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useState, useEffect } from 'react';
import { getApiUrl, unwrapApiPayload } from '../config/api';

import {
  PixelContainer,
  PixelCard,
  PixelButton,
  PixelAvatar,
  PixelTypography,
  TerminalLine,
  PixelSidebar,
} from './pixel';
import LazyImage from './LazyImage';
import LazyGitHubCalendar from './LazyGitHubCalendar';
import { colors } from './pixel/tokens';

const Home = () => {
  const [siteBlock, setSiteBlock] = useState(null);
  const [aboutBlock, setAboutBlock] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');

  const fetchSiteBlock = async () => {
    try {
      const res = await fetch(getApiUrl.siteBlocks());
      const data = await res.json();
      const blocks = unwrapApiPayload(data) || [];
      setSiteBlock(blocks.find(b => b.name === 'home'));
      setAboutBlock(blocks.find(b => b.name === 'about'));
    } catch { /* silent */ }
  };

  const fetchAvatar = async () => {
    try {
      const res = await fetch(getApiUrl.avatars());
      const data = await res.json();
      const avatars = unwrapApiPayload(data) || data.avatars || [];
      const current = avatars.find(a => a.is_current);
      setAvatarUrl(current ? getApiUrl.avatarFile(current.filename) : '/avatar.webp');
    } catch {
      setAvatarUrl('/avatar.webp');
    }
  };

  useEffect(() => {
    fetchSiteBlock();
    fetchAvatar();
  }, []);

  return (
    <>
      {/* Hero Section with Two-Column Layout */}
      <PixelContainer section>
        {/* Terminal Header */}
        <Box className="terminal-header" sx={{ mb: 3 }}>
          ~/handywote
        </Box>

        {/* 两列布局：左侧内容 + 右侧边栏 */}
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 300px' },
            gap: 'clamp(12px, 2vw, 24px)',
            alignItems: 'start',
          }}
        >
          {/* 左侧内容区 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 24px)' }}>
            {/* Hero Card */}
            <PixelCard accentLine>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  {avatarUrl && (
                    <LazyImage
                      src={avatarUrl}
                      alt="HandyWote"
                      fallbackSrc="/avatar.webp"
                      component={PixelAvatar}
                      size="xlarge"
                      sx={{ mb: 3, mx: 'auto' }}
                    />
                  )}
                </motion.div>

                {/* Title with cursor blink */}
                <Typography
                  variant="h1"
                  className="cursor-blink"
                  sx={{
                    fontFamily: 'fontFamily.mono',
                    fontSize: { xs: '2rem', sm: '3rem' },
                    mb: 1,
                  }}
                >
                  {siteBlock?.title || 'HandyWote'}
                </Typography>

                {/* Subtitle */}
                <Typography
                  variant="h4"
                  sx={{
                    fontStyle: 'italic',
                    color: 'text.secondary',
                    fontSize: { xs: '1.25rem', sm: '1.75rem' },
                    mb: 2,
                  }}
                >
                  {siteBlock?.subtitle || '少年侠气交结五都雄！'}
                </Typography>

                {/* Author */}
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    fontFamily: 'fontFamily.mono',
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    mb: 4,
                  }}
                >
                  {siteBlock?.author || '汕头大学 | 黄应辉'}
                </Typography>

                {/* CTA Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <PixelButton
                    variant="primary"
                    suffix="→"
                    startIcon={<GitHubIcon />}
                    component="a"
                    href={siteBlock?.github_url || 'https://github.com/HandyWote'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </PixelButton>
                  <PixelButton
                    variant="outline"
                    suffix="→"
                    component="a"
                    href="#about"
                  >
                    About Me
                  </PixelButton>
                </Box>

                {/* GitHub Calendar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                >
                  <Box
                    className="pixel-grid-bg"
                    sx={{
                      mt: 4,
                      p: 3,
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <PixelTypography muted sx={{ mb: 2, fontSize: '0.75rem' }}>
                      // GitHub Contributions
                    </PixelTypography>
                    <LazyGitHubCalendar
                      src={siteBlock?.github_calendar_url || "https://ghchart.rshah.org/HandyWote"}
                      alt="GitHub Contributions"
                    />
                  </Box>
                </motion.div>
              </Box>
            </PixelCard>
          </Box>

          {/* 右侧边栏 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 24px)' }}>
            {/* 关于我 */}
            <PixelCard accentLine>
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  {avatarUrl && (
                    <LazyImage
                      src={avatarUrl}
                      alt="HandyWote"
                      fallbackSrc="/avatar.webp"
                      component={PixelAvatar}
                      size="xlarge"
                      sx={{ mb: 2, mx: 'auto' }}
                    />
                  )}
                </motion.div>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: 'fontFamily.mono',
                    fontSize: '1.5rem',
                    mb: 1,
                  }}
                >
                  {siteBlock?.title || 'HandyWote'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.85rem',
                    mb: 2,
                  }}
                >
                  {siteBlock?.author || '汕头大学 | 黄应辉'}
                </Typography>
              </Box>
            </PixelCard>

            {/* 教育背景 */}
            <PixelCard title="教育背景">
              <Typography
                variant="body2"
                component="div"
                sx={{ color: 'text.secondary' }}
                dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.education_background || '<span style="color:#484f58">暂无内容</span>' }}
              />
            </PixelCard>

            {/* 兴趣爱好 */}
            <PixelCard title="兴趣爱好">
              <Typography
                variant="body2"
                component="div"
                sx={{ color: 'text.secondary' }}
                dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.hobbies || '<span style="color:#484f58">暂无内容</span>' }}
              />
            </PixelCard>

            {/* 个人愿景 */}
            <PixelCard title="个人愿景">
              <Typography
                variant="body2"
                component="div"
                sx={{ color: 'text.secondary' }}
                dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.personal_vision || '<span style="color:#484f58">暂无内容</span>' }}
              />
            </PixelCard>

          </Box>
        </Box>
      </PixelContainer>

      {/* 空的 About Section (锚点) */}
      <PixelContainer section id="about">
        <TerminalLine>cd ~/about</TerminalLine>
      </PixelContainer>

    </>
  );
};

export default Home;
