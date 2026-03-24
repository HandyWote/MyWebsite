import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import PixelCard from './pixel/ui/PixelCard';
import { getApiUrl, unwrapApiPayload } from '../config/api';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '../config/siteBlocks';

const MotionDiv = motion.div;
const PAGE_SIZE = 10;

function ArticleList() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [pageConfig, setPageConfig] = useState(SITE_BLOCK_DEFAULTS.articles_page);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const sentinelRef = useRef(null);

  const mapArticles = (apiArticles) => apiArticles.map(article => ({
    id: article.id,
    date: article.created_at
      ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : article.date || '',
    title: article.title,
    category: article.category || article.tags?.[0] || '',
    readTime: article.read_time || article.readTime || '5 min read',
  }));

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const [articleRes, blockRes] = await Promise.all([
        fetch(`${getApiUrl.articles()}?page=1&per_page=${PAGE_SIZE}`),
        fetch(getApiUrl.siteBlocks()),
      ]);
      const [articleData, blockData] = await Promise.all([articleRes.json(), blockRes.json()]);
      const payload = unwrapApiPayload(articleData);
      const apiArticles = payload?.items || payload?.articles || [];
      const apiTotal = Number(payload?.total) || apiArticles.length;
      const blocks = unwrapApiPayload(blockData) || [];
      setPageConfig(getBlockContent(blocks, 'articles_page'));
      const mappedArticles = mapArticles(apiArticles);
      setArticles(mappedArticles);
      setTotal(apiTotal);
      setPage(1);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasMore = articles.length < total;

  const fetchMoreArticles = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    try {
      setLoadingMore(true);
      setError(null);
      const nextPage = page + 1;
      const response = await fetch(`${getApiUrl.articles()}?page=${nextPage}&per_page=${PAGE_SIZE}`);
      const responseData = await response.json();
      const payload = unwrapApiPayload(responseData);
      const apiArticles = payload?.items || payload?.articles || [];
      const apiTotal = Number(payload?.total) || total;
      setTotal(apiTotal);
      setPage(nextPage);
      if (apiArticles.length === 0) {
        return;
      }
      const mappedArticles = mapArticles(apiArticles);
      setArticles(prev => [...prev, ...mappedArticles]);
    } catch (err) {
      console.error('Failed to fetch more articles:', err);
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, page, total]);

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    if (loading || !sentinelRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        fetchMoreArticles();
      }
    });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchMoreArticles, loading]);

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
        {!loading && hasMore && (
          <Box
            ref={sentinelRef}
            data-testid="article-list-sentinel"
            sx={{ minHeight: 1 }}
          />
        )}
        {!loading && loadingMore && (
          <Typography
            component="div"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.muted' }}
          >
            Loading more...
          </Typography>
        )}
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
