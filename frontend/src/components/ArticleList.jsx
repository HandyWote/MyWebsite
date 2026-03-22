import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import PixelCard from './pixel/ui/PixelCard';
import { getApiUrl, unwrapApiPayload } from '../config/api';

const MotionDiv = motion.div;

const FALLBACK_ARTICLES = [
  {
    id: 1,
    date: 'Mar 15',
    title: '构建高性能Web服务的10个心得',
    category: '性能优化',
    readTime: '5 min read',
  },
  {
    id: 2,
    date: 'Mar 10',
    title: '从零理解Go并发模型',
    category: 'Go',
    readTime: '8 min read',
  },
  {
    id: 3,
    date: 'Mar 05',
    title: 'React Server Components 深入理解',
    category: 'React',
    readTime: '12 min read',
  },
];

function ArticleList() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState(FALLBACK_ARTICLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(getApiUrl.articles());
      const data = await res.json();
      const payload = unwrapApiPayload(data);
      const apiArticles = payload?.items || payload?.articles || [];

      if (apiArticles.length > 0) {
        const mappedArticles = apiArticles.map(article => ({
          id: article.id,
          date: article.created_at
            ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : article.date || '',
          title: article.title,
          category: article.category || article.tags?.[0] || '',
          readTime: article.read_time || article.readTime || '5 min read',
        }));
        setArticles(mappedArticles);
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <Box>
      {/* 终端头部 */}
      <Box sx={{ mb: 3 }}>
        <Typography
          component="div"
          sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.secondary' }}
        >
          $ ls -la ./articles/
        </Typography>
        {loading ? (
          <Typography
            component="div"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.muted', my: 2 }}
          >
            Loading...
          </Typography>
        ) : error ? (
          <Typography
            component="div"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'error.main', my: 2 }}
          >
            Error: {error}
          </Typography>
        ) : (
          <Typography
            component="div"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'accent.green', mb: 2 }}
          >
            found {articles.length} articles
          </Typography>
        )}
        <Box sx={{ borderBottom: 1, borderColor: 'border.muted' }} />
      </Box>

      {/* 文章列表 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {articles.map((article, index) => (
          <MotionDiv
            key={article.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <ArticleItem article={article} navigate={navigate} />
          </MotionDiv>
        ))}
      </Box>
    </Box>
  );
}

function ArticleItem({ article, navigate }) {
  return (
    <PixelCard
      onClick={() => navigate(`/articles/${article.id}`)}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: 'accent.blue',
          transform: 'translateX(4px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Typography
          component="span"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: 'text.muted',
            fontSize: '0.875rem',
            minWidth: 60,
          }}
        >
          {article.date}
        </Typography>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box component="span" sx={{ color: 'accent.blue' }}>
              ▸
            </Box>
            <Typography
              component="h3"
              sx={{
                fontFamily: 'JetBrains Mono, monospace',
                color: 'text.primary',
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              {article.title}
            </Typography>
          </Box>
          <Typography
            component="div"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.muted',
              fontSize: '0.75rem',
              pl: 3,
            }}
          >
            {article.category} · {article.readTime}
          </Typography>
        </Box>
      </Box>
    </PixelCard>
  );
}

export default ArticleList;
