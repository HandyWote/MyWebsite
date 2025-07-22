// 导入必要的组件和图标
import { motion } from 'framer-motion';  // 用于实现动画效果
import { Box, Typography, Container, Button } from '@mui/material';  // Material-UI组件
import GitHubIcon from '@mui/icons-material/GitHub';  // GitHub图标
import EmailIcon from '@mui/icons-material/Email'; // 邮箱图标
import { LinearProgress } from '@mui/material'; // 进度条组件
import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';

/**
 * Home组件 - 个人主页首屏
 * 包含以下特点：
 * 1. 响应式设计：适配不同屏幕尺寸
 * 2. 动画效果：使用framer-motion实现淡入和缩放动画
 * 3. 玻璃态设计：使用glass-effect类实现磨砂玻璃效果
 * 4. 个人信息展示：头像、名称和个性签名
 */
const Home = () => {
  // Framer Motion 技能动画变量
  const skillVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1, // 每个技能项之间的延迟
      },
    }),
  };

  // 远程数据状态
  const [siteBlock, setSiteBlock] = useState(null);
  const [skills, setSkills] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');

  // 拉取首页介绍、技能、联系方式、头像
  const fetchSiteBlock = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/site-blocks');
      const data = await res.json();
      setSiteBlock(data.data.find(b => b.name === 'home'));
    } catch {}
  };
  const fetchSkills = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/skills');
      const data = await res.json();
      setSkills(data.data || []);
    } catch {}
  };
  const fetchContacts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/contacts');
      const data = await res.json();
      setContacts(data.data || []);
    } catch {}
  };
  const fetchAvatar = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/avatars');
      const data = await res.json();
      const current = (data.avatars || data.data || []).find(a => a.is_current);
      setAvatarUrl(current ? `/api/admin/avatars/file/${current.filename}` : './avatar.jpg');
    } catch { setAvatarUrl('./avatar.jpg'); }
  };

  useEffect(() => {
    fetchSiteBlock();
    fetchSkills();
    fetchContacts();
    fetchAvatar();
    const socket = io('ws://localhost:5000', { path: '/socket.io' });
    socket.on('site_block_updated', fetchSiteBlock);
    socket.on('skills_updated', fetchSkills);
    socket.on('contacts_updated', fetchContacts);
    socket.on('avatars_updated', fetchAvatar);
    return () => socket.disconnect();
  }, []);

  return (
    <section className="section">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="glass-effect"
          style={{
            padding: '2rem',
            borderRadius: '1rem',
            maxWidth: '800px',
            margin: '0 auto',
            marginBottom: '3rem',
          }}
        >
          {/* 首页介绍 */}
          <div id="home">
            {/* 头像动画 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Box
                component="img"
                src={avatarUrl}
                alt="HandyWote"
                sx={{
                  width: { xs: 140, sm: 180 },
                  height: { xs: 140, sm: 180 },
                  borderRadius: '50%',
                  mb: 2,
                  border: '4px solid rgba(255, 255, 255, 0.2)',
                  mx: 'auto',
                  display: 'block'
                }}
              />
            </motion.div>
            <Typography variant="h2" component="h1" sx={{ mb: 1, fontSize: { xs: '2rem', sm: '3rem' }, textAlign: 'center' }}>
              {siteBlock?.title || 'HandyWote'}
            </Typography>
            <Typography
              variant="h4"
              sx={{ mb: 1, fontStyle: 'italic', color: 'text.secondary', fontSize: { xs: '1.5rem', sm: '2rem' }, textAlign: 'center' }}
            >
              {siteBlock?.subtitle || '少年侠气交结五都雄！'}
            </Typography>
            <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, textAlign: 'center' }}>
              {siteBlock?.author || '汕头大学 | 黄应辉'}
            </Typography>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              style={{ textAlign: 'center' }}
            >
              <Button
                variant="outlined"
                size="large"
                startIcon={<GitHubIcon />}
                href={siteBlock?.github_url || 'https://github.com/HandyWote'}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  borderRadius: '2rem',
                  px: { xs: 3, sm: 4 },
                  py: { xs: 1.5, sm: 1 },
                  minWidth: '48px',
                  minHeight: '48px',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                GitHub
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              style={{ marginTop: '2rem', textAlign: 'center' }}
            >
              <Box
                className="glass-effect"
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  maxWidth: '100%',
                  '& img': {
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, color: 'text.secondary' }}
                >
                  GitHub 贡献日历
                </Typography>
                <Box
                  component="img"
                  src={siteBlock?.github_calendar_url || "https://ghchart.rshah.org/HandyWote"}
                  alt="GitHub Contributions"
                  sx={{
                    filter: 'opacity(0.9)',
                    transition: 'filter 0.3s ease',
                    '&:hover': {
                      filter: 'opacity(1)'
                    }
                  }}
                />
              </Box>
            </motion.div>
          </div>

          {/* 关于我 */}
          <div id="about" style={{ marginTop: '3rem' }}>
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{ textAlign: 'center', mb: 3, fontSize: { xs: '2rem', sm: '3rem' } }}
            >
              关于我
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                教育背景
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {siteBlock?.education_background || '目前就读于汕头大学，作为一名充满热情的学生，我正在追求计算机科学的深度学习。'}
              </Typography>
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                兴趣爱好
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {siteBlock?.hobbies || '我对编程和技术充满热情，特别喜欢探索新的技术领域和解决具有挑战性的问题。在课余时间，我喜欢参与开源项目，不断提升自己的技术能力。'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                个人愿景
              </Typography>
              <Typography variant="body1" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {siteBlock?.personal_vision || '我希望能够通过不断学习和实践，在软件开发领域做出自己的贡献。我相信技术可以改变世界，而我正在努力成为这个改变的一部分。'}
              </Typography>
            </Box>
          </div>

          {/* 技能 */}
          <div id="skills" style={{ marginTop: '3rem' }}>
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{ textAlign: 'center', mb: 4, fontSize: { xs: '2rem', sm: '3rem' } }}
            >
              技能专长
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 2 } }}>
              {skills.map((skill, index) => (
                <motion.div
                  key={skill.name}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={skillVariants}
                >
                  <Box sx={{ mb: { xs: 2, sm: 1 } }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                      {skill.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {skill.description}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={skill.level}
                      sx={{
                        height: { xs: 10, sm: 8 },
                        borderRadius: 4,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          backgroundColor: 'primary.main'
                        }
                      }}
                    />
                  </Box>
                </motion.div>
              ))}
            </Box>
          </div>

          {/* 联系方式 */}
          <div id="contact" style={{ marginTop: '3rem', textAlign: 'center' }}>
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{ textAlign: 'center', mb: 4, fontSize: { xs: '2rem', sm: '3rem' } }}
            >
              联系方式
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              {siteBlock?.contact_description || '如果您对我的工作感兴趣，或者想要了解更多信息，欢迎通过以下方式与我联系：'}
            </Typography>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="outlined"
                size="large"
                startIcon={<EmailIcon />}
                href={siteBlock?.email_address || 'mailto:24yhhuang2@stu.edu.cn'}
                sx={{
                  borderRadius: '2rem',
                  px: { xs: 3, sm: 4 },
                  py: { xs: 1.5, sm: 1.5 },
                  minWidth: '48px',
                  minHeight: '48px',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'text.primary',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {siteBlock?.email_address || '24yhhuang2@stu.edu.cn'}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
};

export default Home;