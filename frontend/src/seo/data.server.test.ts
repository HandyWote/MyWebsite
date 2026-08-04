import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllSitemapArticles } from './data.server';

const { getArticlePageMock } = vi.hoisted(() => ({ getArticlePageMock: vi.fn() }));

vi.mock('@/api/publicApi.server', () => ({
  getArticle: vi.fn(),
  getPublicProfile: vi.fn(),
  getArticlePage: getArticlePageMock,
}));

const summary = (id: number) => ({
  id,
  title: `Article ${id}`,
  updated_at: '2026-08-02T00:00:00Z',
});

describe('getAllSitemapArticles', () => {
  beforeEach(() => getArticlePageMock.mockReset());

  it('requests pages of 100 until every article is collected', async () => {
    getArticlePageMock
      .mockResolvedValueOnce({ articles: Array.from({ length: 100 }, (_, index) => summary(index + 1)), total: 101 })
      .mockResolvedValueOnce({ articles: [summary(101)], total: 101 });

    await expect(getAllSitemapArticles()).resolves.toHaveLength(101);
    expect(getArticlePageMock).toHaveBeenNthCalledWith(1, 1, 100);
    expect(getArticlePageMock).toHaveBeenNthCalledWith(2, 2, 100);
  });

  it('stops a repeated full page instead of looping forever', async () => {
    const page = Array.from({ length: 100 }, (_, index) => summary(index + 1));
    getArticlePageMock.mockResolvedValue({ articles: page, total: 200 });

    await expect(getAllSitemapArticles()).rejects.toThrow('did not advance');
    expect(getArticlePageMock).toHaveBeenCalledTimes(2);
  });
});
