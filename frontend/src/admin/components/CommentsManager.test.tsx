import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const apiMocks = vi.hoisted(() => ({
  get: vi.fn<(endpoint: string) => Promise<unknown>>(),
  post: vi.fn<(endpoint: string, data?: unknown) => Promise<unknown>>(),
  put: vi.fn<(endpoint: string, data?: unknown) => Promise<unknown>>(),
  del: vi.fn<(endpoint: string) => Promise<unknown>>(),
  upload: vi.fn<(endpoint: string, file: File, fieldName?: string) => Promise<unknown>>(),
  uploadFiles: vi.fn<(endpoint: string, files: File[], fieldName?: string) => Promise<unknown>>(),
  download: vi.fn<(endpoint: string) => Promise<Blob>>(),
}));

vi.mock('../../api/browser', () => ({
  browserApi: apiMocks,
  unwrapApiPayload: (response: unknown): unknown =>
    response && typeof response === 'object' && 'data' in response
      ? (response as { data: unknown }).data
      : response,
  getApiMessage: (response: unknown, fallback = ''): string => {
    if (!response || typeof response !== 'object') return fallback;
    const payload = response as { msg?: string; message?: string };
    return payload.msg ?? payload.message ?? fallback;
  },
  ApiError: class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));
// Mock useNotification hook（Zustand-backed）。hook 现在直接返回扁平的
// { success, error, info, warning, show, hide }，不再有 notify.notify()。
// 引用必须稳定：CommentsManager 把 error 放进了 useCallback 的依赖数组。
const notificationMocks = vi.hoisted(() => ({
  success: vi.fn<(message: string) => void>(),
  error: vi.fn<(message: string) => void>(),
  info: vi.fn<(message: string) => void>(),
  warning: vi.fn<(message: string) => void>(),
  show: vi.fn<(message: string, severity: string) => void>(),
  hide: vi.fn<() => void>(),
}));

vi.mock('../../hooks/useNotification', () => ({
  default: () => ({
    open: false,
    message: '',
    severity: 'success',
    ...notificationMocks,
  }),
}));

describe('CommentsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.localStorage.getItem).mockReturnValue('token');
    // api.get returns auto-unwrapped data (simulating apiClient behavior)
    apiMocks.get.mockResolvedValue({
      comments: [commentPayload],
      total: 1,
    });
    apiMocks.del.mockResolvedValue(undefined);
  });

  const openDeleteConfirm = async () => {
    // 等评论卡片先渲染出来，否则只能找到页面上的“刷新/导出”按钮
    await screen.findByText('评论者');
    const menuButton = screen
      .getAllByRole('button')
      .find((btn) => btn.querySelector('[data-testid="MoreVertIcon"]'));
    if (!menuButton) throw new Error('评论卡片的更多操作按钮未渲染');
    fireEvent.click(menuButton);
    fireEvent.click(await screen.findByText('删除评论'));
    return screen.findByRole('button', { name: '确认删除' });
  };

  it('有评论数据时正常渲染状态标签', async () => {
    render(<CommentsManager />);

    expect(await screen.findByText('评论者')).toBeInTheDocument();
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('点“删除评论”先弹确认框，取消时不发删除请求', async () => {
    render(<CommentsManager />);

    const confirmButton = await openDeleteConfirm();
    expect(confirmButton).toBeInTheDocument();
    expect(screen.getByText('确定要删除这条评论吗？此操作不可撤销。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(apiMocks.del).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '确认删除' })).not.toBeInTheDocument();
    });
  });

  it('确认删除后调用删除接口并提示成功', async () => {
    render(<CommentsManager />);

    fireEvent.click(await openDeleteConfirm());

    await waitFor(() => {
      expect(apiMocks.del).toHaveBeenCalledWith('/api/admin/comments/1');
    });
    await waitFor(() => {
      expect(notificationMocks.success).toHaveBeenCalledWith('评论删除成功');
    });
  });
});
