import { motion } from 'framer-motion';
import { Box, Typography, Container, Card, CardContent, CardActions, Button } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';

const projects = [
  {
    title: 'Calculate-Game',
    description: '一个趣味性的计算游戏应用，帮助用户通过游戏方式提升数学计算能力。',
    link: 'https://github.com/HandyWote/Calculate-Game'
  },
  {
    title: 'WechatAutoRobort',
    description: '智能微信自动回复机器人，支持自定义回复规则和智能对话功能。',
    link: 'https://github.com/HandyWote/WechatAutoRobort'
  },
  {
    title: 'ToDoList',
    description: '一个简洁高效的待办事项管理应用，帮助用户更好地组织和管理日常任务。',
    link: 'https://github.com/HandyWote/ToDoList'
  }
];

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
            sx={{ textAlign: 'center', mb: 4 }}
          >
            项目作品
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {projects.map((project, index) => (
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
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="h5" gutterBottom>
                      {project.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {project.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<GitHubIcon />}
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        borderRadius: '2rem',
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
            ))}
          </Box>
        </motion.div>
      </Container>
    </section>
  );
};

export default Projects;