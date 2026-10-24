import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useAvatarStore from './avatarStore';

const avatarApiMock = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  publicUrl: vi.fn((filename: string) => `/api/avatars/file/${filename}`),
}));

vi.mock('@/api/avatarApi', () => ({
  avatarApi: avatarApiMock,
}));

/** 与线上模块同名，断言读起来与实现一致。 */
const avatarApi = avatarApiMock;

describe('avatarStore', () => {
  beforeEach(() => {
    useAvatarStore.setState({ avatars: [], loading: false, error: null });
    vi.clearAllMocks();
  });

  it('应该有正确的初始状态', () => {
    expect(useAvatarStore.getState()).toMatchObject({ avatars: [], loading: false, error: null });
  });

  it('应该通过 avatar 领域 API 获取并映射头像列表', async () => {
    avatarApi.fetchAll.mockResolvedValue([{ id: 1, filename: 'a.webp', is_current: true }]);
    await act(async () => useAvatarStore.getState().fetchAvatars());
    expect(useAvatarStore.getState().avatars[0].url).toBe('/api/avatars/file/a.webp');
  });

  it('应该处理获取失败', async () => {
    avatarApi.fetchAll.mockRejectedValue(new Error('Fetch failed'));
    await expect(useAvatarStore.getState().fetchAvatars()).rejects.toThrow('Fetch failed');
    expect(useAvatarStore.getState().error).toBe('Fetch failed');
  });

  it('没有 filename 时 url 应该为 undefined', async () => {
    avatarApi.fetchAll.mockResolvedValue([{ id: 1, is_current: false }]);
    await act(async () => useAvatarStore.getState().fetchAvatars());
    expect(useAvatarStore.getState().avatars[0].url).toBeUndefined();
  });

  it('上传头像后刷新列表', async () => {
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    avatarApi.upload.mockResolvedValue({});
    avatarApi.fetchAll.mockResolvedValue([{ id: 2, filename: 'new.webp' }]);
    await act(async () => useAvatarStore.getState().uploadAvatar(file));
    expect(avatarApi.upload).toHaveBeenCalledWith(file);
    expect(avatarApi.fetchAll).toHaveBeenCalled();
  });

  it('删除头像后刷新列表并返回结果', async () => {
    avatarApi.remove.mockResolvedValue({ msg: '已删除' });
    avatarApi.fetchAll.mockResolvedValue([]);
    const result = await act(async () => useAvatarStore.getState().deleteAvatar(1));
    expect(avatarApi.remove).toHaveBeenCalledWith(1);
    expect(result).toEqual({ msg: '已删除' });
  });
});
