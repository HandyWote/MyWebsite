import { motion } from 'framer-motion';
import { Box, Typography, Container, Card, CardContent, CardActions, Button } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useState, useEffect } from 'react';

const projectVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.2,
      duration: 0.5
    }
  })
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('https://api.github.com/users/HandyWote/pinned');
        const data = await response.json();
        const sortedProjects = data
          .filter(repo => !repo.fork) // 过滤掉 fork 的仓库
          .sort((a, b) => b.stargazers_count - a.stargazers_count) // 按星标数量排序
          .map(repo => ({
            title: repo.name,
            description: repo.description || '暂无描述',
            link: repo.html_url,
            stars: repo.stargazers_count
          }));
        setProjects(sortedProjects);
      } catch (error) {
        console.error('Error fetching GitHub repos:', error);
        // 如果API请求失败，使用默认项目数据
        setProjects([
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
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

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
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{ textAlign: 'center', mb: 4, fontSize: { xs: '2rem', sm: '3rem' } }}
          >
            项目作品
          </Typography>

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