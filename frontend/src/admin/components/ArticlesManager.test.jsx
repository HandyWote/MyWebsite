import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArticlesManager from './ArticlesManager';

const { ioMock } = vi.hoisted(() => ({
  ioMock: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

vi.mock('./articles/ArticleEditDialog', () => ({
  default: () => null,
}));

vi.mock('./articles/AiSettingsDialog', () => ({
  default: () => null,
}));

describe('ArticlesManager', () => {
  beforeEach(() => {
    ioMock.mockReset();
    ioMock.mockReturnValue({
      on: vi.fn(),
      disconnect: vi.fn(),
    });

    window.localStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'test-token';
      return null;
    });

    globalThis.fetch = vi.fn(async (input) => {
      const url = new URL(input, 'http://localhost');
      const page = url.searchParams.get('page');
      const titleByPage = {
        '1': '第1页文章',
        '2': '第2页文章',
      };

      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: Number(page),
              title: titleByPage[page] ?? `第${page}页文章`,
              category: '分类',
              tags: '标签',
              summary: '摘要',
              cover: '',
              created_at: '2026-03-06',
              updated_at: '2026-03-06',
            },
          ],
          total: 20,
        }),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('切换分页后保留当前页数据而不是被 effect 重置到第一页', async () => {
    const user = userEvent.setup();

    render(<ArticlesManager />);

    expect(await screen.findByText('第1页文章')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Go to next page'));

    await waitFor(() => {
      expect(screen.getByText('第2页文章')).toBeInTheDocument();
    });

    expect(screen.queryByText('第1页文章')).not.toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('page=2'),
      expect.any(Object),
    );
  });
});
