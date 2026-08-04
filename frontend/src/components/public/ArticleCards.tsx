import Link from 'next/link';
import { Box, Card, Typography } from '@mui/material';
import type { ArticleSummary } from '@/api/types';
import { formatServerDate } from '@/api/publicApi.server';

export function ArticleCards({ articles }: { articles: ArticleSummary[] }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {articles.map((article) => (
        <Card key={article.id} component={Link} href={`/articles/${article.id}`} sx={{ display: 'block', p: 2, color: 'inherit', textDecoration: 'none', '&:hover': { borderColor: 'primary.main', transform: 'translateX(4px)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Typography component="time" dateTime={article.created_at} sx={{ color: 'text.disabled', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', minWidth: 92 }}>{formatServerDate(article.created_at)}</Typography>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography component="h2" sx={{ color: 'text.primary', fontFamily: 'JetBrains Mono, monospace', fontSize: '1rem', fontWeight: 500, overflowWrap: 'anywhere' }}>▸ {article.title}</Typography>
              <Typography component="div" sx={{ mt: 0.5, color: 'text.disabled', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>{article.category || ''}{article.read_time ? ` · ${article.read_time}` : ''}</Typography>
            </Box>
          </Box>
        </Card>
      ))}
    </Box>
  );
}
