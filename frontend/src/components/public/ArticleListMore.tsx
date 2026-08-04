'use client';

import Link from 'next/link';
import { Box, Button, Card, Typography } from '@mui/material';
import { useState } from 'react';
import { browserApi } from '@/api/browser';
import { API_ENDPOINTS } from '@/api/endpoints';
import type { ArticlePage, ArticleSummary } from '@/api/types';

export function ArticleListMore({ initialCount, total, pageSize = 10 }: { initialCount: number; total: number; pageSize?: number }) {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasMore = initialCount + articles.length < total;
  const loadMore = async () => {
    setLoading(true);
    setError('');
    try {
      const nextPage = page + 1;
      const payload = await browserApi.get<ArticlePage>(`${API_ENDPOINTS.PUBLIC.ARTICLES}?page=${nextPage}&per_page=${pageSize}`);
      const next = payload.items ?? payload.articles ?? [];
      setArticles((current) => [...current, ...next]);
      setPage(nextPage);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load articles');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Box sx={{ mt: 1.5 }}>
      {articles.map((article) => (
        <Card key={article.id} component={Link} href={`/articles/${article.id}`} sx={{ display: 'block', p: 2, mb: 1.5, color: 'inherit' }}>
          <Typography component="h2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1rem' }}>▸ {article.title}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{article.category}</Typography>
        </Card>
      ))}
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      {hasMore && <Button variant="outlined" onClick={loadMore} disabled={loading}>{loading ? 'Loading...' : 'Load more'}</Button>}
    </Box>
  );
}
