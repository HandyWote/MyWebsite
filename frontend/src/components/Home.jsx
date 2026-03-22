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
} from './pixel';
import LazyImage from './LazyImage';
import LazyGitHubCalendar from './LazyGitHubCalendar';
import SkillsSection from './SkillsSection';
import ContactSection from './ContactSection';
import { colors } from './pixel/tokens';

const Home = () => {
  const [siteBlock, setSiteBlock] = useState(null);
  const [aboutBlock, setAboutBlock] = useState(null);
  const [skills, setSkills] = useState([]);
  const [contacts, setContacts] = useState([]);
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

  const fetchSkills = async () => {
    try {
      const res = await fetch(getApiUrl.skills());
      const data = await res.json();
      setSkills(unwrapApiPayload(data) || []);
    } catch { /* silent */ }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch(getApiUrl.contacts());
      const data = await res.json();
      setContacts(unwrapApiPayload(data) || []);
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
    fetchSkills();
    fetchContacts();
    fetchAvatar();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <PixelContainer section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Terminal Header */}
          <Box className="terminal-header" sx={{ mb: 3 }}>
            ~/handywote
          </Box>

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
        </motion.div>
      </PixelContainer>

      {/* About Section */}
      <PixelContainer section id="about">
        <TerminalLine>cd ~/about</TerminalLine>

        <PixelCard title="教育背景" accentLine sx={{ mt: 3 }}>
          <Typography
            variant="body2"
            component="div"
            sx={{ color: 'text.secondary' }}
            dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.education_background || '<span style="color:#484f58">暂无内容</span>' }}
          />
        </PixelCard>

        <PixelCard title="兴趣爱好" accentLine sx={{ mt: 3 }}>
          <Typography
            variant="body2"
            component="div"
            sx={{ color: 'text.secondary' }}
            dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.hobbies || '<span style="color:#484f58">暂无内容</span>' }}
          />
        </PixelCard>

        <PixelCard title="个人愿景" accentLine sx={{ mt: 3 }}>
          <Typography
            variant="body2"
            component="div"
            sx={{ color: 'text.secondary' }}
            dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.personal_vision || '<span style="color:#484f58">暂无内容</span>' }}
          />
        </PixelCard>
      </PixelContainer>

      {/* Skills Section */}
      <SkillsSection skills={skills} />

      {/* Contact Section */}
      <ContactSection
        contacts={contacts}
        contactDescription={siteBlock?.contact_description}
      />
    </>
  );
};

export default Home;
