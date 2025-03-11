import { motion } from 'framer-motion';
import { Box, Typography, Container, Button } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';

const Home = () => {
  return (
    <section id="home" className="section">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="glass-effect"
          style={{
            padding: '2rem',
            borderRadius: '1rem',
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto'
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Box
              component="img"
              src="/avatar.jpg"
              alt="HandyWote"
              sx={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                mb: 2,
                border: '4px solid rgba(255, 255, 255, 0.2)'
              }}
            />
          </motion.div>

          <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
            HandyWote
          </Typography>

          <Typography
            variant="h4"
            sx={{ mb: 1, fontStyle: 'italic', color: 'text.secondary' }}
          >
            少年侠气交结五都雄！
          </Typography>

          <Typography variant="h6" sx={{ mb: 2 }}>
            汕头大学 | 黄应辉
          </Typography>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              variant="outlined"
              size="large"
              startIcon={<GitHubIcon />}
              href="https://github.com/HandyWote"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                borderRadius: '2rem',
                px: 4,
                py: 1,
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
        </motion.div>
      </Container>
    </section>
  );
};

export default Home;