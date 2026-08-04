import type { Metadata } from 'next';
import { Box, Typography } from '@mui/material';
import { getArticlePage, getArticlesPageConfig } from '@/api/publicApi.server';
import { pageMetadata } from '@/seo/site';
import { ArticleCards } from '@/components/public/ArticleCards';
import { ArticleListMore } from '@/components/public/ArticleListMore';
import { PublicShell } from '@/components/public/PublicShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = pageMetadata({
  title: 'Articles',
  description: 'HandyWote 的文章与技术分享。',
  path: '/articles',
});

const PAGE_SIZE = 10;

async function getInitialArticlePage() {
  try {
    return { value: await getArticlePage(1, PAGE_SIZE), error: '' };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : 'Unable to load articles' };
  }
}

export default async function ArticlesPage() {
  const [config, result] = await Promise.all([
    getArticlesPageConfig(),
    getInitialArticlePage(),
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
