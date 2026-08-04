import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Box, Button, Card, Chip, Typography } from '@mui/material';
import { ArrowLeft, CalendarDays, Eye } from 'lucide-react';
import { API_ENDPOINTS } from '@/api/endpoints';
import { formatServerDate, getArticle } from '@/api/publicApi.server';
import { ServerApiError } from '@/api/server';
import { normalizeTags } from '@/utils/normalizeTags';
import { ArticleActions } from '@/components/public/ArticleActions';
import { CommentSectionClient } from '@/components/public/CommentSectionClient';
import { MarkdownContent } from '@/components/public/MarkdownContent';
import { PdfViewerClient } from '@/components/public/PdfViewerClient';
import { PublicShell } from '@/components/public/PublicShell';

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id).catch((error: unknown) => {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  });
  const tags = normalizeTags(article.tags ?? []);
  const pdfUrl = article.pdf_filename ? API_ENDPOINTS.PUBLIC.ARTICLE_PDF(article.pdf_filename) : '';
  return (
    <PublicShell activePath={`/articles/${id}`}>
      <Typography sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace', mb: 1.5 }}>cat article/{id}.md</Typography>
      <Box sx={{ border: 1, borderStyle: 'dashed', borderColor: 'divider', p: { xs: 1.25, sm: 3 } }}>
        <Button component={Link} href="/articles" variant="text" startIcon={<ArrowLeft size={16} />}>exit buffer</Button>
        <Card component="article" sx={{ mt: 2, p: { xs: 1.5, sm: 3 } }}>
          <Typography component="h1" variant="h2" sx={{ mb: 2, overflowWrap: 'anywhere' }}>{article.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {article.category && <Chip label={article.category} color="primary" />}
            {tags.map((tag) => <Chip key={tag} label={tag} variant="outlined" />)}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3, color: 'text.secondary' }}>
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}><CalendarDays size={16} /><time dateTime={article.created_at}>{formatServerDate(article.created_at)}</time></Box>
            {typeof article.views === 'number' && <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}><Eye size={16} />{article.views} 次阅读</Box>}
            <Box sx={{ ml: { sm: 'auto' } }}><ArticleActions title={article.title} summary={article.summary} /></Box>
          </Box>
          {article.summary && <Typography color="text.secondary" sx={{ mb: 3 }}>{article.summary}</Typography>}
          {article.content_type === 'pdf' && article.pdf_filename ? (
            <Box>
              <Button component="a" href={pdfUrl} target="_blank" rel="noreferrer" variant="outlined" sx={{ mb: 2 }}>Open PDF</Button>
              <PdfViewerClient filename={article.pdf_filename} />
            </Box>
          ) : <MarkdownContent content={article.content ?? ''} />}
        </Card>
        <Box sx={{ mt: 3 }}><CommentSectionClient articleId={article.id} /></Box>
      </Box>
    </PublicShell>
  );
}
