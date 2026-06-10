// Articles组件 - Terminal Aesthetics 风格
import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, TextField, InputAdornment } from '@mui/material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { PixelContainer, PixelCard, PixelButton, PixelTypography, TerminalLine } from './pixel';
import ArticleCard from './ArticleCard';
import ArticlePagination from './ArticlePagination';
import { getApiUrl, unwrapApiPayload } from '../config/api';
import { normalizeTags } from '../utils/normalizeTags';

const Articles = () => {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: 9 });
      if (search) params.append('search', search);

      const res = await fetch(`${getApiUrl.articles()}?${params}`);
      const data = await res.json();
      const payload = unwrapApiPayload(data);
      const items = payload?.items || payload?.articles || [];
      const processedArticles = items.map(article => ({
        ...article,
        tags: normalizeTags(article.tags),
      }));
      setArticles(processedArticles);
      setTotalPages(payload?.total_pages || 1);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [page, search]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const isStandalonePage = window.location.pathname === '/articles';

  return (
    <PixelContainer section>
      {/* Terminal Header */}
      <TerminalLine>cat articles.md</TerminalLine>

      <PixelCard sx={{ mt: 3 }}>
        {/* Back Button */}
        {isStandalonePage && (
          <Box sx={{ mb: 3 }}>
            <PixelButton
              variant="ghost"
              startIcon={<ArrowLeft size={16} />}
              component={Link}
              to="/"
            >
              返回首页
            </PixelButton>
          </Box>
        )}

        {/* Search */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="搜索文章..."
            value={search}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#8b949e" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.875rem',
                borderRadius: 0,
                bgcolor: '#21262d',
                '& fieldset': {
                  borderStyle: 'dashed',
                  borderColor: '#30363d',
                },
                '&:hover fieldset': {
                  borderStyle: 'solid',
                  borderColor: '#30363d',
                },
                '&.Mui-focused fieldset': {
                  borderStyle: 'solid',
                  borderColor: '#58a6ff',
                  borderWidth: '1px',
                },
              },
            }}
          />
        </Box>

        {/* Article count */}
        <PixelTypography muted sx={{ mb: 2, fontSize: '0.75rem' }}>
          // {articles.length} articles found
        </PixelTypography>

        {/* Article list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {articles.map((article, index) => (
            <ArticleCard key={article.id} article={article} index={index} />
          ))}
          {articles.length === 0 && !loading && (
            <PixelTypography muted sx={{ textAlign: 'center', py: 4 }}>
              No articles found.
            </PixelTypography>
          )}
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ mt: 4 }}>
            <ArticlePagination
              page={page}
              count={totalPages}
              onChange={(_, newPage) => setPage(newPage)}
            />
          </Box>
        )}
      </PixelCard>
    </PixelContainer>
  );
};

export default Articles;
