import { motion } from 'framer-motion';
import { Box, Typography, Container, Button } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';

const Contact = () => {
  return (
    <section id="contact" className="section">
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
            textAlign: 'center'
          }}
        >
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{ textAlign: 'center', mb: 4 }}
          >
            联系方式
          </Typography>

          <Typography variant="body1" sx={{ mb: 4 }}>
            如果您对我的工作感兴趣，或者想要了解更多信息，欢迎通过以下方式与我联系：
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
              href="mailto:24yhhuang2@stu.edu.cn"
              sx={{
                borderRadius: '2rem',
                px: 4,
                py: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              24yhhuang2@stu.edu.cn
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
};

export default Contact;