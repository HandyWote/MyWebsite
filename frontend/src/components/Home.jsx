// 导入必要的组件和图标
import { motion } from 'framer-motion';  // 用于实现动画效果
import { Box, Typography, Container, Button } from '@mui/material';  // Material-UI组件
import GitHubIcon from '@mui/icons-material/GitHub';  // GitHub图标
import { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api'; // 导入API配置

// 导入子组件
import LazyImage from './LazyImage';
import LazyGitHubCalendar from './LazyGitHubCalendar';
import SkillsSection from './SkillsSection';
import ContactSection from './ContactSection';

/**
 * Home组件 - 个人主页首屏
 * 包含以下特点：
 * 1. 响应式设计：适配不同屏幕尺寸
 * 2. 动画效果：使用framer-motion实现淡入和缩放动画
 * 3. 玻璃态设计：使用glass-effect类实现磨砂玻璃效果
 * 4. 个人信息展示：头像、名称和个性签名
 */
const Home = () => {
  // 远程数据状态
  const [siteBlock, setSiteBlock] = useState(null);
  const [aboutBlock, setAboutBlock] = useState(null);
  const [skills, setSkills] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');

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
    } catch { 
      setAvatarUrl('./avatar.jpg'); 
    }
  };

  useEffect(() => {
    fetchSiteBlock();
    fetchSkills();
    fetchContacts();
    fetchAvatar();
    
    let socket = null;
    let reconnectTimeout = null;
    let ioModule = null;
    
    // 延迟建立WebSocket连接，避免阻塞页面加载
    const connectWebSocket = async () => {
      if (socket) return; // 避免重复连接
      
      try {
        // 动态导入socket.io-client，避免在初始bundle中包含
        if (!ioModule) {
          ioModule = await import('socket.io-client');
        }
        
        socket = ioModule.default(getApiUrl.websocket(), { 
          path: '/socket.io/',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
          timeout: 5000
        });
        
        socket.on('site_block_updated', fetchSiteBlock);
        socket.on('skills_updated', fetchSkills);
        socket.on('contacts_updated', fetchContacts);
        socket.on('avatars_updated', fetchAvatar);
        
        socket.on('connect_error', (error) => {
          console.log('WebSocket连接错误:', error);
        });
      } catch (error) {
        console.log('WebSocket模块加载失败:', error);
      }
    };
    
    // 延迟3秒建立连接，让页面先完成加载
    reconnectTimeout = setTimeout(connectWebSocket, 3000);
    
    // 页面可见性变化时的处理
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时断开连接
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      } else {
        // 页面显示时重新连接
        if (!socket) {
          reconnectTimeout = setTimeout(connectWebSocket, 1000);
        }
      }
    };
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socket) {
        socket.disconnect();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('aboutBlock:', aboutBlock);
    }
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
                <LazyImage
                  src={avatarUrl}
                  alt="HandyWote"
                  fallbackSrc="./avatar.jpg"
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
                <LazyGitHubCalendar
                  src={siteBlock?.github_calendar_url || "https://ghchart.rshah.org/HandyWote"}
                  alt="GitHub Contributions"
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
          <SkillsSection skills={skills} />

          {/* 联系方式 */}
          <ContactSection 
            contacts={contacts} 
            contactDescription={siteBlock?.contact_description} 
          />
        </motion.div>
      </Container>
    </section>
  );
};

export default Home;
