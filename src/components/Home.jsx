// 导入必要的组件和图标
import { motion } from 'framer-motion';  // 用于实现动画效果
import { Box, Typography, Container, Button } from '@mui/material';  // Material-UI组件
import GitHubIcon from '@mui/icons-material/GitHub';  // GitHub图标

/**
 * Home组件 - 个人主页首屏
 * 包含以下特点：
 * 1. 响应式设计：适配不同屏幕尺寸
 * 2. 动画效果：使用framer-motion实现淡入和缩放动画
 * 3. 玻璃态设计：使用glass-effect类实现磨砂玻璃效果
 * 4. 个人信息展示：头像、名称和个性签名
 */
const Home = () => {
  return (
    <section id="home" className="section">
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
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto'
          }}
        >
          {/* 头像容器，带有缩放动画效果 */}
          <motion.div
            initial={{ scale: 0 }}         // 初始状态：缩放为0
            animate={{ scale: 1 }}         // 动画结束状态：原始大小
            transition={{ delay: 0.3, duration: 0.5 }}  // 延迟0.3秒开始，持续0.5秒
          >
            <Box
              component="img"
              src="./avatar.jpg"
              alt="HandyWote"
              sx={{
                width: { xs: 140, sm: 180 },     // 响应式宽度
                height: { xs: 140, sm: 180 },    // 响应式高度
                borderRadius: '50%',             // 圆形头像
                mb: 2,                          // 下边距
                border: '4px solid rgba(255, 255, 255, 0.2)'  // 半透明边框
              }}
            />
          </motion.div>

          {/* 名称标题 */}
          <Typography variant="h2" component="h1" sx={{ mb: 1, fontSize: { xs: '2rem', sm: '3rem' } }}>
            HandyWote
          </Typography>

          {/* 个性签名 */}
          <Typography
            variant="h4"
            sx={{ mb: 1, fontStyle: 'italic', color: 'text.secondary', fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            少年侠气交结五都雄！
          </Typography>

          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
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
            style={{ marginTop: '2rem' }}
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
              <Box
                component="img"
                src="https://ghchart.rshah.org/HandyWote"
                alt="GitHub Contributions"
                sx={{
                  filter: 'opacity(0.9)',
                  transition: 'filter 0.3s ease',
                  '&:hover': {
                    filter: 'opacity(1)'
                  }
                }}
              />
            </Box>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
};

export default Home;