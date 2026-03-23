import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import PixelCard from './pixel/ui/PixelCard';
import { getApiUrl, unwrapApiPayload } from '../config/api';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '../config/siteBlocks';

const MotionDiv = motion.div;

function ArticleList() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [pageConfig, setPageConfig] = useState(SITE_BLOCK_DEFAULTS.articles_page);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const [articleRes, blockRes] = await Promise.all([
        fetch(getApiUrl.articles()),
        fetch(getApiUrl.siteBlocks()),
      ]);
      const [articleData, blockData] = await Promise.all([articleRes.json(), blockRes.json()]);
      const payload = unwrapApiPayload(articleData);
      const apiArticles = payload?.items || payload?.articles || [];
      const blocks = unwrapApiPayload(blockData) || [];
      setPageConfig(getBlockContent(blocks, 'articles_page'));

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
      } else {
        setArticles([]);
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
        {pageConfig.title && (
          <Typography
            component="div"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.primary', mb: 1 }}
          >
            {pageConfig.title}
          </Typography>
        )}
        {pageConfig.subtitle && (
          <Typography
            component="div"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.secondary', mb: 1 }}
          >
            {pageConfig.subtitle}
          </Typography>
        )}
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
        {articles.length === 0 && !loading && !error && (
          <Typography
            component="div"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.muted' }}
          >
            {pageConfig.empty_text || SITE_BLOCK_DEFAULTS.articles_page.empty_text}
          </Typography>
        )}
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
