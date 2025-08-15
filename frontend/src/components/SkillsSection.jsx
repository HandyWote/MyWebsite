import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, LinearProgress } from '@mui/material';

/**
 * 技能展示组件
 * 展示技能列表和对应的进度条
 * 使用 Framer Motion 实现动画效果
 */
const SkillsSection = ({ skills }) => {
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

  return (
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
  );
};

export default SkillsSection;
