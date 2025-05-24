// 导入必要的组件
import { motion } from 'framer-motion';  // 用于实现动画效果
import { Box, Typography, Container, Button } from '@mui/material';  // Material-UI组件
import EmailIcon from '@mui/icons-material/Email';  // 邮件图标

/**
 * Contact组件 - 联系方式页面
 * 包含以下特点：
 * 1. 响应式设计：
 *    - 文字大小根据屏幕尺寸自适应
 *    - 按钮尺寸和间距响应式调整
 * 2. 动画效果：
 *    - 整体内容淡入动画
 *    - 邮件按钮延迟显示动画
 * 3. 交互设计：
 *    - 邮件链接直接打开默认邮件客户端
 *    - 按钮悬停效果
 * 4. 玻璃态设计：使用glass-effect类实现磨砂玻璃效果
 */
const Contact = () => {
  return (
    <section id="contact" className="section">
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
            margin: '0 auto',
            textAlign: 'center'
          }}
        >
          {/* 页面标题 */}
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{ textAlign: 'center', mb: 4, fontSize: { xs: '2rem', sm: '3rem' } }}  // 响应式字体大小
          >
            联系方式
          </Typography>

          {/* 说明文字 */}
          <Typography variant="body1" sx={{ mb: 4, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            如果您对我的工作感兴趣，或者想要了解更多信息，欢迎通过以下方式与我联系：
          </Typography>

          {/* 邮件按钮容器，带有延迟淡入动画 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}  // 延迟0.3秒后显示
          >
            {/* 邮件联系按钮 */}
            <Button
              variant="outlined"
              size="large"
              startIcon={<EmailIcon />}
              href="mailto:24yhhuang2@stu.edu.cn"
              sx={{
                borderRadius: '2rem',           // 圆角按钮
                px: { xs: 3, sm: 4 },          // 响应式水平内边距
                py: { xs: 1.5, sm: 1.5 },      // 响应式垂直内边距
                minWidth: '48px',              // 最小宽度
                minHeight: '48px',             // 最小高度
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'text.primary',
                fontSize: { xs: '0.875rem', sm: '1rem' },
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