// frontend/src/stores/avatarStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useAvatarStore from './avatarStore';

vi.mock('@/config/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    post: vi.fn(),
    upload: vi.fn(),
  },
  uploadFile: vi.fn(),
  getApiUrl: {
    adminAvatars: () => '/api/admin/avatars',
    adminAvatarSetCurrent: (id) => `/api/admin/avatars/${id}/set_current`,
    adminAvatarDelete: (id) => `/api/admin/avatars/${id}`,
    avatarFile: (filename) => `/api/avatars/file/${filename}`,
  },
  API_ENDPOINTS: {
    PUBLIC: {},
    ADMIN: {
      AVATARS: '/api/admin/avatars',
      AVATAR_DELETE: (id) => `/api/admin/avatars/${id}`,
      AVATAR_SET_CURRENT: (id) => `/api/admin/avatars/${id}/set_current`,
    },
  },
  default: {},
}));

import { api } from '@/config/api';

describe('avatarStore', () => {
  beforeEach(() => {
    useAvatarStore.setState({
      avatars: [],
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useAvatarStore.getState();
      expect(state.avatars).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe('fetchAvatars', () => {
    it('应该成功获取头像列表', async () => {
      api.get.mockResolvedValueOnce([
        { id: 1, filename: 'a.webp', is_current: true, uploaded_at: '2026-01-01' },
      ]);

      await act(async () => {
        await useAvatarStore.getState().fetchAvatars();
      });

      const state = useAvatarStore.getState();
      expect(state.avatars).toHaveLength(1);
      expect(state.avatars[0].url).toBe('/api/avatars/file/a.webp');
      expect(state.loading).toBe(false);
    });

    it('应该处理获取失败', async () => {
      api.get.mockRejectedValueOnce(new Error('Fetch failed'));

      // zustand store 断言不需要 React act，避免 React 19 act 的微任务时序陷阱
      await expect(
        useAvatarStore.getState().fetchAvatars()
      ).rejects.toThrow('Fetch failed');

      expect(useAvatarStore.getState().error).toBe('Fetch failed');
    });

    it('没有 filename 时 url 应该为 undefined', async () => {
      api.get.mockResolvedValueOnce([{ id: 1, is_current: false }]);

      await act(async () => {
        await useAvatarStore.getState().fetchAvatars();
      });

      expect(useAvatarStore.getState().avatars[0].url).toBeUndefined();
    });
  });

  describe('uploadAvatar', () => {
    it('应该上传头像并刷新列表', async () => {
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
      api.upload.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce([{ id: 2, filename: 'new.webp' }]);

      await act(async () => {
        await useAvatarStore.getState().uploadAvatar(mockFile);
      });

      expect(api.upload).toHaveBeenCalledWith('/api/admin/avatars', mockFile);
      expect(api.get).toHaveBeenCalled();
    });
  });

  describe('deleteAvatar', () => {
    it('应该删除头像并刷新列表', async () => {
      api.del.mockResolvedValueOnce({ msg: '已删除' });
      api.get.mockResolvedValueOnce([]);

      const result = await act(async () => {
        return await useAvatarStore.getState().deleteAvatar(1);
      });

      expect(api.del).toHaveBeenCalledWith('/api/admin/avatars/1');
      expect(result).toEqual({ msg: '已删除' });
    });
  });

  describe('setCurrent', () => {
    it('应该设置当前头像并刷新列表', async () => {
      api.put.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce([{ id: 1, is_current: true }]);

      await act(async () => {
        await useAvatarStore.getState().setCurrent(1);
      });

      expect(api.put).toHaveBeenCalledWith('/api/admin/avatars/1/set_current');
    });
  });

  describe('reorderAvatars', () => {
    it('应该重排头像并设置第一个为当前', async () => {
      api.put.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce([
        { id: 2, is_current: true, url: '/api/avatars/file/2.webp' },
        { id: 1, is_current: false, url: '/api/avatars/file/1.webp' },
      ]);

      const newOrder = [{ id: 2 }, { id: 1 }];

      await act(async () => {
        await useAvatarStore.getState().reorderAvatars(newOrder);
      });

      // fetchAvatars 会用服务端数据覆盖本地顺序
      expect(useAvatarStore.getState().avatars[0].id).toBe(2);
      expect(api.put).toHaveBeenCalledWith('/api/admin/avatars/2/set_current');
    });
  });
});
