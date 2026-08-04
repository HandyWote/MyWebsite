import 'server-only';

import { cache } from 'react';
import { getArticle, getArticlePage, getPublicProfile } from '@/api/publicApi.server';
import type { ArticleSummary } from '@/api/types';

export const getArticleForPage = cache(getArticle);
export const getProfileForPage = cache(getPublicProfile);

export async function getAllSitemapArticles(): Promise<ArticleSummary[]> {
  const articles: ArticleSummary[] = [];
  const seenIds = new Set<number>();
  const perPage = 100;

  for (let page = 1; ; page += 1) {
    const result = await getArticlePage(page, perPage);
    const pageArticles = result.items ?? result.articles ?? [];
    let added = 0;
    for (const article of pageArticles) {
      if (!seenIds.has(article.id)) {
        seenIds.add(article.id);
        articles.push(article);
        added += 1;
      }
    }

    const total = Number(result.total);
    if (pageArticles.length === 0 || pageArticles.length < perPage || (Number.isFinite(total) && articles.length >= total)) break;
    if (added === 0) throw new Error('Article pagination did not advance');
  }

  return articles;
}
