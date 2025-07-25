// 导入必要的组件和hooks
import { motion } from 'framer-motion';  // 用于实现动画效果
import { Box, Typography, Container, Card, CardContent, CardActions, Button, IconButton, Tooltip, Alert } from '@mui/material';  // Material-UI组件
import GitHubIcon from '@mui/icons-material/GitHub';  // GitHub图标
import RefreshIcon from '@mui/icons-material/Refresh'; // 刷新图标
import { useState, useEffect } from 'react';  // React hooks

// 定义项目卡片的动画变体
const projectVariants = {
  hidden: { opacity: 0, y: 20 },  // 初始隐藏状态
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.2,    // 每个项目依次显示，间隔0.2秒
      duration: 0.5     // 动画持续0.5秒
    }
  })
};

/**
 * Projects组件 - 项目展示页面
 * 包含以下特点：
 * 1. GitHub API集成：自动获取和展示GitHub仓库信息
 * 2. 智能排序：根据描述、星标数和更新时间对项目进行排序
 * 3. 动画效果：
 *    - 整体内容淡入动画
 *    - 项目卡片依次显示的动画
 * 4. 响应式设计：布局适配不同屏幕尺寸
 * 5. 错误处理：包含加载状态和错误处理机制
 * 6. 缓存机制：缓存GitHub数据到localStorage，每日首次访问更新
 */
const Projects = () => {
  // 状态管理
  const [projects, setProjects] = useState([]);  // 存储项目数据
  const [loading, setLoading] = useState(true);  // 控制加载状态
  const [lastUpdated, setLastUpdated] = useState(null); // 上次更新时间
  const [isCacheData, setIsCacheData] = useState(false); // 是否使用缓存数据
  const [error, setError] = useState(null); // 错误信息

  // 检查缓存是否有效（是否为当天）
  const isCacheValid = (timestamp) => {
    if (!timestamp) return false;
    const lastUpdateDate = new Date(timestamp).toDateString();
    const today = new Date().toDateString();
    return lastUpdateDate === today;
  };

  // 从localStorage获取缓存数据
  const getCachedProjects = () => {
    try {
      const cachedData = localStorage.getItem('githubProjects');
      if (cachedData) {
        const { timestamp, data } = JSON.parse(cachedData);
        if (isCacheValid(timestamp)) {
          setLastUpdated(timestamp);
          setIsCacheData(true);
          return data;
        }
      }
    } catch (error) {
      console.error('Error reading cached data:', error);
    }
    return null;
  };

  // 将数据保存到localStorage
  const cacheProjects = (data) => {
    try {
      const timestamp = new Date().toISOString();
      localStorage.setItem('githubProjects', JSON.stringify({
        timestamp,
        data
      }));
      setLastUpdated(timestamp);
      setIsCacheData(false);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  };

  // 获取GitHub项目数据
  const fetchProjectsFromGitHub = async () => {
    try {
      // 获取用户所有仓库
      const response = await fetch('https://api.github.com/users/HandyWote/repos');
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      // 项目智能排序逻辑
      const sortedProjects = data
        .filter(repo => !repo.fork)  // 过滤掉fork的仓库
        .sort((a, b) => {
          // 优先考虑有描述的仓库
          if (!!a.description !== !!b.description) return !!b.description - !!a.description;
          // 其次按星标数排序
          if (b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count;
          // 最后按更新时间排序
          return new Date(b.updated_at) - new Date(a.updated_at);
        })
        // 格式化项目数据
        .map(repo => ({
          title: repo.name,
          description: repo.description || '暂无描述',
          link: repo.html_url,
          stars: repo.stargazers_count
        }));

      // 清除错误信息
      setError(null);
      
      // 缓存数据
      cacheProjects(sortedProjects);
      return sortedProjects;
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      throw error;
    }
  };

  // 获取项目数据（优先使用缓存）
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 首先检查是否有有效的缓存数据
      const cachedProjects = getCachedProjects();
      if (cachedProjects) {
        setProjects(cachedProjects);
        setLoading(false);
        return;
      }

      // 如果没有有效缓存，则从GitHub获取数据
      const githubProjects = await fetchProjectsFromGitHub();
      setProjects(githubProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error.message);
      
      // 如果API请求失败，使用默认项目数据
      const defaultProjects = [
        {
          title: 'WechatAutoRobort',
          description: '智能微信自动回复机器人，支持自定义回复规则和智能对话功能。',
          link: 'https://github.com/HandyWote/WechatAutoRobort'
        },
        {
          title: 'ToDoList',
          description: '一个简洁高效的待办事项管理应用，帮助用户更好地组织和管理日常任务。',
          link: 'https://github.com/HandyWote/ToDoList'
        },
        {
          title: 'Calculate-Game',
          description: '一个趣味性的计算游戏应用，帮助用户通过游戏方式提升数学计算能力。',
          link: 'https://github.com/HandyWote/Calculate-Game'
        },
      ];
      setProjects(defaultProjects);
      // 即使使用默认数据，也缓存以防网络问题
      cacheProjects(defaultProjects);
    } finally {
      setLoading(false);
    }
  };

  // 手动刷新数据
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const githubProjects = await fetchProjectsFromGitHub();
      setProjects(githubProjects);
    } catch (error) {
      // 即使刷新失败，也保持现有数据
      console.error('Error refreshing projects:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 在组件挂载时获取GitHub项目数据
  useEffect(() => {
    fetchProjects();
  }, []);

  // 格式化更新时间显示
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <section id="projects" className="section">
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
            margin: '0 auto'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{ textAlign: 'center', fontSize: { xs: '2rem', sm: '3rem' } }}
            >
              项目作品
            </Typography>
            <Tooltip title="刷新项目数据">
              <IconButton onClick={handleRefresh} size="small" sx={{ ml: 2 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              获取GitHub项目数据时遇到问题: {error}. 正在显示缓存或默认数据。
            </Alert>
          )}
          
          {lastUpdated && (
            <Typography variant="body2" align="center" sx={{ mb: 2, color: 'text.secondary' }}>
              {isCacheData ? '使用缓存数据' : '数据已更新'} - 最后更新: {formatLastUpdated(lastUpdated)}
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 2 } }}>
            {loading ? (
              <Typography variant="body1" sx={{ textAlign: 'center' }}>
                正在加载项目信息...
              </Typography>
            ) : (
              projects.map((project, index) => (
                <motion.div
                  key={project.title}
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={projectVariants}
                >
                  <Card
                    sx={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '1rem'
                    }}
                  >
                    <CardContent sx={{ pb: { xs: 2, sm: 1 } }}>
                      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                        {project.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {project.description}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', p: { xs: 2, sm: 1 } }}>
                      <Button
                        variant="outlined"
                        startIcon={<GitHubIcon />}
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          borderRadius: '2rem',
                          px: { xs: 3, sm: 2 },
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
                        查看项目
                      </Button>
                    </CardActions>
                  </Card>
                </motion.div>
              ))
            )}
          </Box>
        </motion.div>
      </Container>
    </section>
  );
};

export default Projects;