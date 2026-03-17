import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Articles from './Articles';

vi.mock('./ArticleCard', () => ({
  default: ({ article }) => <div>{article.title}</div>,
}));

vi.mock('./ArticleFilters', () => ({
  default: () => <div>filters</div>,
}));

vi.mock('./ArticlePagination', () => ({
  default: () => <div>pagination</div>,
}));

describe('Articles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn((url) => {
      const requestUrl = String(url);

      if (requestUrl.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ code: 0, data: ['前端开发'] }),
        });
      }

      if (requestUrl.includes('/api/tags')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ code: 0, data: { React: 1 } }),
        });
      }

      if (requestUrl.includes('/api/articles')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            code: 0,
            data: {
              articles: [
                {
                  id: 1,
                  title: '文章A',
                  summary: '摘要',
                  category: '前端开发',
                  tags: ['React'],
                  views: 10,
                  comment_count: 0,
                  created_at: '2026-01-01T00:00:00Z',
                },
              ],
              pages: 1,
            },
          }),
        });
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({}),
      });
    });
  });

  it('支持后端 code/data 包装格式并正确渲染文章列表', async () => {
    render(<Articles />);

    await waitFor(() => {
      expect(screen.getByText('文章A')).toBeInTheDocument();
    });
  });
});
