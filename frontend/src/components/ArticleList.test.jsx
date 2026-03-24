import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ArticleList from './ArticleList';
import { SITE_BLOCK_DEFAULTS } from '../config/siteBlocks';

const mockNavigate = vi.fn();
const observerInstances = [];

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    observerInstances.push(this);
  }

  observe() {}

  disconnect() {}

  unobserve() {}

  trigger(isIntersecting = true) {
    this.callback([{ isIntersecting }]);
  }
}

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('ArticleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observerInstances.length = 0;
    globalThis.IntersectionObserver = MockIntersectionObserver;
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

  it('loads 10 articles first and appends next page when sentinel intersects', async () => {
    const page1 = Array.from({ length: 10 }, (_, idx) => ({
      id: idx + 1,
      title: `Article-${idx + 1}`,
      category: 'Test',
      created_at: '2026-03-01T00:00:00Z',
    }));
    const page2 = Array.from({ length: 10 }, (_, idx) => ({
      id: idx + 11,
      title: `Article-${idx + 11}`,
      category: 'Test',
      created_at: '2026-03-02T00:00:00Z',
    }));

    globalThis.fetch = vi.fn((url) => {
      const requestUrl = String(url);

      if (requestUrl.includes('/api/site-blocks')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      if (requestUrl.includes('/api/articles?page=1&per_page=10')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { articles: page1, total: 26, page: 1 } }),
        });
      }
      if (requestUrl.includes('/api/articles?page=2&per_page=10')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { articles: page2, total: 26, page: 2 } }),
        });
      }

      return Promise.resolve({ ok: false, json: async () => ({}) });
    });

    render(<ArticleList />);

    expect(await screen.findByText('Article-1')).toBeInTheDocument();
    expect(screen.getByText('found 10 articles')).toBeInTheDocument();
    await waitFor(() => {
      expect(observerInstances.length).toBeGreaterThan(0);
    });

    await act(async () => {
      observerInstances[0].trigger(true);
    });

    await waitFor(() => {
      expect(screen.getByText('Article-20')).toBeInTheDocument();
      expect(screen.getByText('found 20 articles')).toBeInTheDocument();
    });
  });
});
