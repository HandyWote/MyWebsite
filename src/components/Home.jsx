// 导入必要的组件和图标
import { motion } from 'framer-motion';  // 用于实现动画效果
import { Box, Typography, Container, Button } from '@mui/material';  // Material-UI组件
import GitHubIcon from '@mui/icons-material/GitHub';  // GitHub图标
import EmailIcon from '@mui/icons-material/Email'; // 邮箱图标
import { LinearProgress } from '@mui/material'; // 进度条组件
import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PhoneIcon from '@mui/icons-material/Phone';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import SvgIcon from '@mui/material/SvgIcon';
import { getApiUrl } from '../config/api'; // 导入API配置

function WechatIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 1024 1024" sx={{ color: '#213547' }}>
      <path d="M337.387283 341.82659c-17.757225 0-35.514451 11.83815-35.514451 29.595375s17.757225 29.595376 35.514451 29.595376 29.595376-11.83815 29.595376-29.595376c0-18.49711-11.83815-29.595376-29.595376-29.595375zM577.849711 513.479769c-11.83815 0-22.936416 12.578035-22.936416 23.6763 0 12.578035 11.83815 23.676301 22.936416 23.676301 17.757225 0 29.595376-11.83815 29.595376-23.676301s-11.83815-23.676301-29.595376-23.6763zM501.641618 401.017341c17.757225 0 29.595376-12.578035 29.595376-29.595376 0-17.757225-11.83815-29.595376-29.595376-29.595375s-35.514451 11.83815-35.51445 29.595375 17.757225 29.595376 35.51445 29.595376zM706.589595 513.479769c-11.83815 0-22.936416 12.578035-22.936416 23.6763 0 12.578035 11.83815 23.676301 22.936416 23.676301 17.757225 0 29.595376-11.83815 29.595376-23.676301s-11.83815-23.676301-29.595376-23.6763z" fill="currentColor"></path>
      <path d="M510.520231 2.959538C228.624277 2.959538 0 231.583815 0 513.479769s228.624277 510.520231 510.520231 510.520231 510.520231-228.624277 510.520231-510.520231-228.624277-510.520231-510.520231-510.520231zM413.595376 644.439306c-29.595376 0-53.271676-5.919075-81.387284-12.578034l-81.387283 41.433526 22.936416-71.768786c-58.450867-41.433526-93.965318-95.445087-93.965317-159.815029 0-113.202312 105.803468-201.988439 233.803468-201.98844 114.682081 0 216.046243 71.028902 236.023121 166.473989-7.398844-0.739884-14.797688-1.479769-22.196532-1.479769-110.982659 1.479769-198.289017 85.086705-198.289017 188.67052 0 17.017341 2.959538 33.294798 7.398844 49.572255-7.398844 0.739884-15.537572 1.479769-22.936416 1.479768z m346.265896 82.867052l17.757225 59.190752-63.630058-35.514451c-22.936416 5.919075-46.612717 11.83815-70.289017 11.83815-111.722543 0-199.768786-76.947977-199.768786-172.393063-0.739884-94.705202 87.306358-171.653179 198.289017-171.65318 105.803468 0 199.028902 77.687861 199.028902 172.393064 0 53.271676-34.774566 100.624277-81.387283 136.138728z" fill="currentColor"></path>
    </SvgIcon>
  );
}

function QQIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 1024 1024" sx={{ color: '#213547' }}>
      <path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.3-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" fill="currentColor"></path>
    </SvgIcon>
  );
}

const iconMap = {
  email: <EmailIcon sx={{ color: '#213547' }} />,
  phone: <PhoneIcon sx={{ color: '#213547' }} />,
  wechat: <WechatIcon sx={{ color: '#213547' }} />,
  qq: <QQIcon sx={{ color: '#213547' }} />,
  other: <ContentCopyIcon sx={{ color: '#213547' }} />
};

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
  const [aboutBlock, setAboutBlock] = useState(null);
  const [skills, setSkills] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const handleCopy = (value) => {
    navigator.clipboard.writeText(value);
    setSnackbarMsg('已复制到剪贴板');
    setSnackbarOpen(true);
  };

  // 拉取首页介绍、技能、联系方式、头像
  const fetchSiteBlock = async () => {
    try {
      const res = await fetch(getApiUrl.siteBlocks());
      const data = await res.json();
      setSiteBlock(data.data.find(b => b.name === 'home'));
      setAboutBlock(data.data.find(b => b.name === 'about'));
    } catch {}
  };
  const fetchSkills = async () => {
    try {
      const res = await fetch(getApiUrl.skills());
      const data = await res.json();
      setSkills(data.data || []);
    } catch {}
  };
  const fetchContacts = async () => {
    try {
      const res = await fetch(getApiUrl.contacts());
      const data = await res.json();
      setContacts(data.data || []);
    } catch {}
  };
  const fetchAvatar = async () => {
    try {
      const res = await fetch(getApiUrl.avatars());
      const data = await res.json();
      const current = (data.avatars || data.data || []).find(a => a.is_current);
      setAvatarUrl(current ? getApiUrl.avatarFile(current.filename) : './avatar.jpg');
    } catch { setAvatarUrl('./avatar.jpg'); }
  };

  useEffect(() => {
    fetchSiteBlock();
    fetchSkills();
    fetchContacts();
    fetchAvatar();
    const socket = io(getApiUrl.websocket(), { 
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    socket.on('site_block_updated', fetchSiteBlock);
    socket.on('skills_updated', fetchSkills);
    socket.on('contacts_updated', fetchContacts);
    socket.on('avatars_updated', fetchAvatar);
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    console.log('aboutBlock:', aboutBlock);
  }, [aboutBlock]);

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
              {avatarUrl ? (
                <Box
                  component="img"
                  src={avatarUrl}
                  alt="HandyWote"
                  onError={(e) => {
                    e.target.src = './avatar.jpg';
                  }}
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
              ) : null}
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
              <Typography
                variant="body1"
                paragraph
                component="div"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.education_background || '<span style="color:#aaa">暂无内容</span>' }}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                兴趣爱好
              </Typography>
              <Typography
                variant="body1"
                paragraph
                component="div"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.hobbies || '<span style="color:#aaa">暂无内容</span>' }}
              />
            </Box>
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                个人愿景
              </Typography>
              <Typography
                variant="body1"
                paragraph
                component="div"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                dangerouslySetInnerHTML={{ __html: aboutBlock?.content?.personal_vision || '<span style="color:#aaa">暂无内容</span>' }}
              />
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
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {contacts.map((c) => (
                <Tooltip title="点击复制" key={c.id} placement="top">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      p: 1.2,
                      borderRadius: 2,
                      minWidth: 260,
                      fontSize: 16,
                      bgcolor: 'rgba(255,255,255,0.08)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                    }}
                    onClick={() => handleCopy(c.value)}
                  >
                    {iconMap[c.type] || iconMap.other}
                    <span style={{ marginLeft: 12 }}>{c.value}</span>
                  </Box>
                </Tooltip>
              ))}
            </Box>
            <Snackbar
              open={snackbarOpen}
              autoHideDuration={1500}
              onClose={() => setSnackbarOpen(false)}
              message={snackbarMsg}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
          </div>
        </motion.div>
      </Container>
    </section>
  );
};

export default Home;