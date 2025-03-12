import { motion } from 'framer-motion';
import { Box, Typography, Container } from '@mui/material';

const About = () => {
  return (
    <section id="about" className="section">
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
            sx={{ textAlign: 'center', mb: 3, fontSize: { xs: '2rem', sm: '3rem' } }}
          >
            关于我
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              教育背景
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              目前就读于汕头大学，作为一名充满热情的学生，我正在追求计算机科学的深度学习。
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              兴趣爱好
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              我对编程和技术充满热情，特别喜欢探索新的技术领域和解决具有挑战性的问题。在课余时间，我喜欢参与开源项目，不断提升自己的技术能力。
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              个人愿景
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              我希望能够通过不断学习和实践，在软件开发领域做出自己的贡献。我相信技术可以改变世界，而我正在努力成为这个改变的一部分。
            </Typography>
          </Box>
        </motion.div>
      </Container>
    </section>
  );
};

export default About;