// 导入必要的组件
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';  // 用于实现动画效果
import { Box, Typography, Container, CircularProgress } from '@mui/material';  // Material-UI组件

const defaultFields = {
  education_background: '目前就读于汕头大学，作为一名充满热情的学生，我正在追求计算机科学的深度学习。',
  hobbies: '我对编程和技术充满热情，特别喜欢探索新的技术领域和解决具有挑战性的问题。在课余时间，我喜欢参与开源项目，不断提升自己的技术能力。',
  personal_vision: '我希望能够通过不断学习和实践，在软件开发领域做出自己的贡献。我相信技术可以改变世界，而我正在努力成为这个改变的一部分。'
};

const fetchAbout = async () => {
  try {
    const res = await fetch('/api/site-blocks');
    if (!res.ok) throw new Error('网络错误');
    const data = await res.json();
    const about = (data.data || []).find(b => b.name === 'about');
    return about && about.content ? about.content : null;
  } catch {
    return null;
  }
};

/**
 * About组件 - 个人介绍页面
 * 包含以下特点：
 * 1. 响应式设计：文字大小根据屏幕尺寸自适应
 * 2. 动画效果：使用framer-motion实现内容淡入
 * 3. 玻璃态设计：使用glass-effect类实现磨砂玻璃效果
 * 4. 分段展示：教育背景、兴趣爱好、个人愿景三个部分
 */
const About = () => {
  const [fields, setFields] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAbout().then(content => {
      if (content) {
        setFields(content);
        setError(false);
      } else {
        setFields(defaultFields);
        setError(true);
      }
      setLoading(false);
    });
  }, []);

  return (
    <section id="about" className="section">
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
            sx={{ textAlign: 'center', mb: 3, fontSize: { xs: '2rem', sm: '3rem' } }}  // 响应式字体大小
          >
            关于我
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : fields ? (
            <>
              {/* 教育背景部分 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  教育背景
                </Typography>
                <Typography variant="body1" paragraph component="div" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  dangerouslySetInnerHTML={{ __html: fields.education_background || '<span style="color:#aaa">暂无内容</span>' }}
                />
              </Box>
              {/* 兴趣爱好部分 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  兴趣爱好
                </Typography>
                <Typography variant="body1" paragraph component="div" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  dangerouslySetInnerHTML={{ __html: fields.hobbies || '<span style="color:#aaa">暂无内容</span>' }}
                />
              </Box>
              {/* 个人愿景部分 */}
              <Box>
                <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  个人愿景
                </Typography>
                <Typography variant="body1" paragraph component="div" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  dangerouslySetInnerHTML={{ __html: fields.personal_vision || '<span style="color:#aaa">暂无内容</span>' }}
                />
              </Box>
              {error && (
                <Typography color="error" align="center" sx={{ mt: 2 }}>
                  后端接口请求失败，已展示默认内容
                </Typography>
              )}
            </>
          ) : (
            <Typography color="text.secondary" align="center">暂无关于我内容</Typography>
          )}
        </motion.div>
      </Container>
    </section>
  );
};

export default About;