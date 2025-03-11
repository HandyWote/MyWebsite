import { motion } from 'framer-motion';
import { Box, Typography, Container, LinearProgress } from '@mui/material';

const skills = [
  { name: 'Python 开发', level: 90, description: '熟练掌握 Python 编程，具有丰富的开发经验' },
  { name: 'Qt', level: 85, description: '熟悉 Qt 框架，有丰富的桌面应用开发经验' },
  { name: 'C++', level: 80, description: '精通 C++ 编程语言，具备扎实的基础知识' },
];

const skillVariants = {
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

const Skills = () => {
  return (
    <section id="skills" className="section">
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
            技能专长
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {skills.map((skill, index) => (
              <motion.div
                key={skill.name}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={skillVariants}
              >
                <Box sx={{ mb: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {skill.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {skill.description}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={skill.level}
                    sx={{
                      height: 8,
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
        </motion.div>
      </Container>
    </section>
  );
};

export default Skills;