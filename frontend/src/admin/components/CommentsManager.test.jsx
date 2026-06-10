import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CommentsManager from './CommentsManager';

const commentPayload = {
  id: 1,
  author: '评论者',
  email: 'user@example.com',
  content: '这是一条评论',
  status: 'normal',
  ip_address: '127.0.0.1',
  article_title: '测试文章',
  created_at: '2024-01-15T10:30:00Z',
};

describe('CommentsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.getItem.mockReturnValue('token');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        code: 0,
        data: {
          comments: [commentPayload],
          total: 1,
        },
      }),
    });
  });

  it('有评论数据时正常渲染状态标签', async () => {
    render(
      <MemoryRouter>
        <CommentsManager />
      </MemoryRouter>
    );

    expect(await screen.findByText('评论者')).toBeInTheDocument();
    expect(screen.getByText('正常')).toBeInTheDocument();
  });
});
