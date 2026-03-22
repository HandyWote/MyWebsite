// ArticleCard组件 - Terminal Aesthetics 风格
import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { PixelCard, PixelChip, PixelTypography } from './pixel';
import LazyImage from './LazyImage';

const ArticleCard = ({ article, index }) => {
  const formatDate = useMemo(() => (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <PixelCard
        component={Link}
        to={`/articles/${article.id}`}
        accentLine
        sx={{
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
          '&:hover': {
            textDecoration: 'none',
            color: 'inherit',
          },
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Cover Image */}
          {article.cover_image && (
            <LazyImage
              src={article.cover_image}
              alt={article.title}
              fallbackSrc="/placeholder.webp"
              sx={{
                width: { xs: '100%', sm: '160px', md: '180px' },
                height: { xs: '140px', sm: '120px', md: '140px' },
                objectFit: 'cover',
                flexShrink: 0,
                alignSelf: 'flex-start',
              }}
            />
          )}

          {/* Content */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Title */}
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'fontFamily.mono',
                fontSize: { xs: '1rem', sm: '1.125rem' },
                fontWeight: 600,
                mb: 1,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {article.title}
            </Typography>

            {/* Summary */}
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {article.summary || '暂无摘要'}
            </Typography>

            {/* Meta */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Date */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Calendar size={12} color="#8b949e" />
                <PixelTypography muted sx={{ fontSize: '0.7rem' }}>
                  {formatDate(article.created_at)}
                </PixelTypography>
              </Box>

              {/* Tags */}
              {article.tags?.slice(0, 3).map((tag) => (
                <PixelChip key={tag} label={tag} size="small" />
              ))}
              {article.tags?.length > 3 && (
                <PixelTypography muted sx={{ fontSize: '0.7rem' }}>
                  +{article.tags.length - 3}
                </PixelTypography>
              )}
            </Box>
          </Box>
        </Box>
      </PixelCard>
    </motion.div>
  );
};

export default memo(ArticleCard);
