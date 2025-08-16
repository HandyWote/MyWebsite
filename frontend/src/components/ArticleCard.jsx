import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Comment as CommentIcon,
  CalendarToday as CalendarIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { getApiUrl } from '../config/api';
import { articleCard, articleCardMedia, articleCardContent, chipStyles, buttonStyles } from '../theme/theme';

/**
 * 文章卡片组件
 * 展示文章的标题、摘要、分类、标签等信息
 * 支持分享功能和响应式设计
 */
const ArticleCard = ({ article, index, onShare }) => {
  // 卡片动画变体
  const cardVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }), []);

  // 格式化日期
  const formatDate = useMemo(() => (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
    >
      <Card
        sx={articleCard}
      >
        {/* 封面图片 */}
        {article.cover_image && (
          <CardMedia
            component="img"
            sx={articleCardMedia}
            image={article.cover_image ? `${getApiUrl.websocket()}${article.cover_image}` : undefined}
            alt={article.title}
          />
        )}

        <CardContent sx={articleCardContent}>
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            minHeight: 0
          }}>
            {/* 分类 */}
            <Chip
              label={article.category}
              size="small"
              color="primary"
              sx={{ 
                alignSelf: 'flex-start', 
                mb: 1,
                ...chipStyles.small
              }}
            />

            {/* 标题 */}
            <Typography
              variant="h6"
              component={RouterLink}
              to={`/articles/${article.id}`}
              sx={{
                fontWeight: 'bold',
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' },
                textDecoration: 'none',
                color: 'inherit',
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                lineHeight: 1.3,
                mb: { xs: 0.5, sm: 1 },
                mt: 0,
                pt: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {article.title}
            </Typography>

            {/* 摘要 */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ 
                mb: { xs: 1, sm: 2 }, 
                flexGrow: 1,
                lineHeight: 1.5,
                fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.875rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: { xs: 2, sm: 3, md: 3 },
                WebkitBoxOrient: 'vertical',
                minHeight: 0,
              }}
            >
              {article.summary}
            </Typography>

            {/* 标签 */}
            {article.tags && article.tags.length > 0 && (
              <Box sx={{ 
                mb: { xs: 1, sm: 2 }, 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 0.5,
                minHeight: '24px'
              }}>
                {article.tags.slice(0, 2).map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={chipStyles.small}
                  />
                ))}
                {article.tags.length > 2 && (
                  <Chip
                    label={`+${article.tags.length - 2}`}
                    size="small"
                    variant="outlined"
                    sx={chipStyles.small}
                  />
                )}
              </Box>
            )}

            {/* 统计信息 */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: { xs: 0.5, sm: 1 }, 
              mb: { xs: 1, sm: 2 },
              flexWrap: 'wrap',
              minHeight: '20px'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VisibilityIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {article.views}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CommentIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {article.comment_count}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(article.created_at)}
                </Typography>
              </Box>
            </Box>

            {/* 操作按钮 */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              mt: 'auto', 
              pt: { xs: 0.5, sm: 1 },
              minHeight: { xs: '32px', sm: '36px' },
              flexShrink: 0
            }}>
              <Button
                variant="contained"
                size="small"
                fullWidth
                component={RouterLink}
                to={`/articles/${article.id}`}
                sx={buttonStyles.primary}
              >
                阅读全文
              </Button>
              <IconButton
                size="small"
                onClick={() => onShare(article)}
              >
                <ShareIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default memo(ArticleCard);
