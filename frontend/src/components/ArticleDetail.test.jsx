import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ArticleDetail from './ArticleDetail';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '42' })
}));

vi.mock('./PdfViewerOnCanvas', () => ({
  default: () => <div>PDF Viewer Mock</div>
}));

const mockArticle = {
  id: 42,
  title: '测试文章标题',
  summary: '测试文章摘要',
  content: '# 正文内容',
  category: '测试分类',
  tags: ['React'],
  cover: null,
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  views: 99
};

let writeTextMock;

describe('ArticleDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes('/comments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { comments: [] } })
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockArticle)
      });
    });

    writeTextMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window, 'alert', {
      configurable: true,
      value: vi.fn()
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'http://localhost:5173',
        href: 'http://localhost:5173/articles/42'
      }
    });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock
      }
    });

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined
    });
  });

  it('加载文章详情后展示标题', async () => {
    render(<ArticleDetail />);

    expect(await screen.findByText('测试文章标题')).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/articles/42'));
  });

  it('在不支持原生分享时回退为复制链接', async () => {
    render(<ArticleDetail />);

    await screen.findByText('测试文章标题');

    const shareButton = screen.getByLabelText('分享文章');

    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('http://localhost:5173/articles/42');
    });
  });
});
