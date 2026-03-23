import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ArticleList from './ArticleList';
import { SITE_BLOCK_DEFAULTS } from '../config/siteBlocks';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('ArticleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses articles_page config title and empty text', async () => {
    globalThis.fetch = vi.fn((url) => {
      const requestUrl = String(url);

      if (requestUrl.includes('/api/site-blocks')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                name: 'articles_page',
                content: {
                  title: '文章归档',
                  empty_text: '暂时还没有文章',
                },
              },
            ],
          }),
        });
      }

      if (requestUrl.includes('/api/articles')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: { articles: [] },
          }),
        });
      }

      return Promise.resolve({ ok: false, json: async () => ({}) });
    });

    render(<ArticleList />);

    await waitFor(() => {
      expect(screen.getByText('文章归档')).toBeInTheDocument();
      expect(screen.getByText('暂时还没有文章')).toBeInTheDocument();
    });
  });

  it('falls back to default empty text when config is missing', async () => {
    globalThis.fetch = vi.fn((url) => {
      const requestUrl = String(url);

      if (requestUrl.includes('/api/site-blocks')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }

      if (requestUrl.includes('/api/articles')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: { articles: [] },
          }),
        });
      }

      return Promise.resolve({ ok: false, json: async () => ({}) });
    });

    render(<ArticleList />);

    await waitFor(() => {
      expect(screen.getByText('No articles found.')).toBeInTheDocument();
    });
  });

  it('articles_page defaults only keep title/subtitle/empty_text', () => {
    expect(SITE_BLOCK_DEFAULTS.articles_page).toEqual({
      title: '~/articles',
      subtitle: '',
      empty_text: 'No articles found.',
    });
    expect(SITE_BLOCK_DEFAULTS.articles_page.show_filters).toBeUndefined();
    expect(SITE_BLOCK_DEFAULTS.articles_page.show_pagination).toBeUndefined();
    expect(SITE_BLOCK_DEFAULTS.articles_page.default_page_size).toBeUndefined();
    expect(SITE_BLOCK_DEFAULTS.articles_page.default_sort).toBeUndefined();
  });
});
