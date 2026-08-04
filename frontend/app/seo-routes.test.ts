import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';
import sitemap from './sitemap';

const { getAllSitemapArticlesMock } = vi.hoisted(() => ({ getAllSitemapArticlesMock: vi.fn() }));

vi.mock('@/seo/data.server', () => ({ getAllSitemapArticles: getAllSitemapArticlesMock }));

describe('SEO metadata routes', () => {
  afterEach(() => {
    delete process.env.PUBLIC_SITE_URL;
    getAllSitemapArticlesMock.mockReset();
  });

  it('uses PUBLIC_SITE_URL for robots and excludes private routes', () => {
    process.env.PUBLIC_SITE_URL = 'https://portfolio.example';

    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/internal', '/api'],
      },
      sitemap: 'https://portfolio.example/sitemap.xml',
      host: 'https://portfolio.example/',
    });
  });

  it('lists static pages and all articles with lastModified without legacy /app URLs', async () => {
    process.env.PUBLIC_SITE_URL = 'https://portfolio.example';
    getAllSitemapArticlesMock.mockResolvedValue([
      { id: 1, title: 'One', updated_at: '2026-08-01T00:00:00Z' },
      { id: 2, title: 'Two', created_at: '2026-07-01T00:00:00Z' },
    ]);

    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://portfolio.example/',
      'https://portfolio.example/articles',
      'https://portfolio.example/projects',
      'https://portfolio.example/articles/1',
      'https://portfolio.example/articles/2',
    ]);
    expect(entries.every((entry) => entry.lastModified instanceof Date)).toBe(true);
    expect(entries.some((entry) => entry.url.includes('/app'))).toBe(false);
  });
});
