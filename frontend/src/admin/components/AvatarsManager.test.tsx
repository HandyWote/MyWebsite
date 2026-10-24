import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarsManager from './AvatarsManager';
import type { Avatar as AvatarItem } from '@/api/types';

const avatarApiMock = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  publicUrl: vi.fn((filename: string) => `/api/avatars/file/${filename}`),
}));

vi.mock('../../api/avatarApi', () => ({ avatarApi: avatarApiMock }));

// Mock useNotification hook (Zustand-backed，扁平 API: notify.success/error)
vi.mock('../../hooks/useNotification', () => ({
  default: () => ({
    open: false,
    message: '',
    severity: 'info',
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  }),
}));

/** 与线上模块同名，断言读起来与实现一致。 */
const avatarApi = avatarApiMock;

function renderWithAvatars(avatars: AvatarItem[]) {
  avatarApi.fetchAll.mockResolvedValue(avatars);
  const view = render(<AvatarsManager />);
  return view;
}

const fileInputOf = (container: HTMLElement): Element => {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not rendered');
  return input;
};

describe('AvatarsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('只有一个头像时只展示一张头像预览，且不出现序号与排序/设为当前操作', async () => {
    renderWithAvatars([
      { id: 1, filename: 'only.webp', is_current: true, uploaded_at: '2026-03-23T10:00:00Z' },
    ]);

    const images = await screen.findAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', '/api/avatars/file/only.webp');

    expect(screen.queryByText(/^头像\s*\d+$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '设为当前头像' })).not.toBeInTheDocument();
    expect(screen.getByText(/上传时间/)).toBeInTheDocument();
  });

  it('展示 is_current 为真的那张头像，而不是列表第一项', async () => {
    renderWithAvatars([
      { id: 1, filename: 'newer.webp', is_current: false, uploaded_at: '2026-03-23T10:00:00Z' },
      { id: 2, filename: 'older.webp', is_current: true, uploaded_at: '2026-03-22T10:00:00Z' },
    ]);

    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(1);
      expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', '/api/avatars/file/older.webp');
    });
  });

  it('选择文件上传后调用 avatarApi.upload 并重新拉取列表', async () => {
    avatarApi.upload.mockResolvedValue({});
    const { container } = renderWithAvatars([
      { id: 1, filename: 'only.webp', is_current: true, uploaded_at: '2026-03-23T10:00:00Z' },
    ]);

    await waitFor(() => expect(avatarApi.fetchAll).toHaveBeenCalledTimes(1));

    const file = new File(['image'], 'avatar.webp', { type: 'image/webp' });
    fireEvent.change(fileInputOf(container), { target: { files: [file] } });

    await waitFor(() => {
      expect(avatarApi.upload).toHaveBeenCalledWith(file);
      expect(avatarApi.fetchAll).toHaveBeenCalledTimes(2);
    });
  });

  it('点击删除头像会打开确认框，确认后调用删除接口', async () => {
    avatarApi.remove.mockResolvedValue({ msg: '已删除' });
    renderWithAvatars([
      { id: 7, filename: 'only.webp', is_current: true, uploaded_at: '2026-03-23T10:00:00Z' },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: /删除头像/ }));

    // 真实 PixelConfirmDialog：打开后先不删，点「确认删除」才发请求
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(avatarApi.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '确认删除' }));

    await waitFor(() => expect(avatarApi.remove).toHaveBeenCalledWith(7));
  });

  it('确认框里取消不会删除头像', async () => {
    renderWithAvatars([
      { id: 8, filename: 'only.webp', is_current: true, uploaded_at: '2026-03-23T10:00:00Z' },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: /删除头像/ }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(avatarApi.remove).not.toHaveBeenCalled();
  });

  it('没有头像时展示空状态并保留上传入口', async () => {
    renderWithAvatars([]);

    expect(await screen.findByText('暂无头像，请上传新头像')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /上传新头像/ })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
