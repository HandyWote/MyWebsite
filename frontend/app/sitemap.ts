import type { MetadataRoute } from 'next';
import { getAllSitemapArticles } from '@/seo/data.server';
import { absoluteSiteUrl } from '@/seo/site';

export const dynamic = 'force-dynamic';

function validDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllSitemapArticles();
  const generatedAt = new Date();
  const articleEntries = articles.map((article) => ({
    url: absoluteSiteUrl(`/articles/${article.id}`),
    lastModified: validDate(article.updated_at) ?? validDate(article.created_at) ?? generatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
  const latestArticleUpdate = articleEntries.reduce<Date | undefined>((latest, entry) => {
    if (!(entry.lastModified instanceof Date)) return latest;
    return !latest || entry.lastModified > latest ? entry.lastModified : latest;
  }, undefined) ?? generatedAt;

  return [
    { url: absoluteSiteUrl('/'), lastModified: latestArticleUpdate, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteSiteUrl('/articles'), lastModified: latestArticleUpdate, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteSiteUrl('/projects'), lastModified: latestArticleUpdate, changeFrequency: 'weekly', priority: 0.8 },
    ...articleEntries,
  ];
}
