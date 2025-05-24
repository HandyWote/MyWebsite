// 导入必要的组件
import { motion } from 'framer-motion';  // 用于实现动画效果
import { Box, Typography, Container, LinearProgress } from '@mui/material';  // Material-UI组件

// 定义技能数据
const skills = [
  { name: 'Python 开发', level: 90, description: '熟练掌握 Python 编程，具有丰富的开发经验' },
  { name: 'Qt', level: 85, description: '熟悉 Qt 框架，有丰富的桌面应用开发经验' },
  { name: 'C++', level: 80, description: '精通 C++ 编程语言，具备扎实的基础知识' },
];

// 定义技能条目的动画变体
const skillVariants = {
  hidden: { opacity: 0, y: 20 },  // 初始隐藏状态
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.2,    // 每个技能依次显示，间隔0.2秒
      duration: 0.5     // 动画持续0.5秒
    }
  })
};

/**
 * Skills组件 - 技能展示页面
 * 包含以下特点：
 * 1. 响应式设计：布局和间距根据屏幕尺寸自适应
 * 2. 动画效果：
 *    - 整体内容淡入动画
 *    - 技能条目依次显示的动画
 * 3. 进度条展示：使用LinearProgress组件展示技能掌握程度
 * 4. 玻璃态设计：使用glass-effect类实现磨砂玻璃效果
 */
const Skills = () => {
  return (
    <section id="skills" className="section">
      <Container>
        {/* 主要内容容器，带有淡入动画效果 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}  // 初始状态：透明度为0，向下偏移20px
          animate={{ opacity: 1, y: 0 }}   // 动画结束状态：完全显示，回到原位
          transition={{ duration: 0.8 }}   // 动画持续时间0.8秒
          className="glass-effect"
          style={{
            padding: '2rem',
            borderRadius: '1rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}
        >
          {/* 页面标题 */}
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{ textAlign: 'center', mb: 4, fontSize: { xs: '2rem', sm: '3rem' } }}  // 响应式字体大小
          >
            技能专长
          </Typography>

          {/* 技能列表容器 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 2 } }}>
            {/* 使用map函数渲染每个技能条目 */}
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
        </motion.div>
      </Container>
    </section>
  );
};

export default Skills;