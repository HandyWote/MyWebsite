import { connection } from 'next/server';
import { Box, Typography } from '@mui/material';
import { getArticlePage, getArticlesPageConfig } from '@/api/publicApi.server';
import { ArticleCards } from '@/components/public/ArticleCards';
import { ArticleListMore } from '@/components/public/ArticleListMore';
import { PublicShell } from '@/components/public/PublicShell';

const PAGE_SIZE = 10;

export default async function ArticlesPage() {
  await connection();
  const [config, result] = await Promise.all([
    getArticlesPageConfig(),
    getArticlePage(1, PAGE_SIZE).then((value) => ({ value, error: '' })).catch((error: unknown) => ({ value: null, error: error instanceof Error ? error.message : 'Unable to load articles' })),
  ]);
  const articles = result.value?.items ?? result.value?.articles ?? [];
  const total = Number(result.value?.total) || articles.length;
  return (
    <PublicShell activePath="/articles">
      <Box sx={{ mb: 3 }}>
        {config.title && <Typography component="h1" sx={{ color: 'text.primary', fontFamily: 'JetBrains Mono, monospace', fontSize: '1rem', mb: 1 }}>{String(config.title)}</Typography>}
        {config.subtitle && <Typography sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace', mb: 1 }}>{String(config.subtitle)}</Typography>}
        <Typography sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>$ ls -la ./articles/</Typography>
        <Typography sx={{ color: result.error ? 'error.main' : 'success.main', fontFamily: 'JetBrains Mono, monospace', mb: 2 }}>{result.error ? `error: ${result.error}` : `found ${total} articles`}</Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />
      </Box>
      {articles.length > 0 ? <ArticleCards articles={articles} /> : !result.error && <Typography color="text.secondary">{String(config.empty_text)}</Typography>}
      <ArticleListMore initialCount={articles.length} total={total} pageSize={PAGE_SIZE} />
    </PublicShell>
  );
}
