// frontend/src/stores/commentStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useCommentStore from './commentStore';

vi.mock('@/config/api', () => {
  const adminEndpoints = {
    ADMIN_COMMENTS: '/api/admin/comments',
    DELETE_COMMENT: (id) => `/api/admin/comments/${id}`,
    COMMENT_STATUS: (id) => `/api/admin/comments/${id}/status`,
    COMMENT_EXPORT: () => '/api/admin/comments/export',
  };
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
      upload: vi.fn(),
      download: vi.fn(),
    },
    uploadFile: vi.fn(),
    API_ENDPOINTS: {
      PUBLIC: {},
      ADMIN: adminEndpoints,
    },
    default: {
      API_ENDPOINTS: {
        PUBLIC: {},
        ADMIN: adminEndpoints,
      },
    },
  };
});

import { api, API_ENDPOINTS } from '@/config/api';

global.fetch = vi.fn();

describe('commentStore', () => {
  beforeEach(() => {
    useCommentStore.setState({
      comments: [],
      total: 0,
      page: 1,
      perPage: 10,
      searchTerm: '',
      statusFilter: '',
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useCommentStore.getState();
      expect(state.comments).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.page).toBe(1);
      expect(state.perPage).toBe(10);
      expect(state.searchTerm).toBe('');
      expect(state.statusFilter).toBe('');
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe('fetchComments', () => {
    it('应该成功获取评论列表', async () => {
      api.get.mockResolvedValueOnce({
        comments: [
          { id: 1, author: '评论者', status: 'normal', article_title: '测试文章' },
        ],
        total: 1,
      });

      await act(async () => {
        await useCommentStore.getState().fetchComments();
      });

      const state = useCommentStore.getState();
      expect(state.comments).toHaveLength(1);
      expect(state.comments[0].author).toBe('评论者');
      expect(state.total).toBe(1);
      expect(state.loading).toBe(false);
    });

    it('应该处理获取失败', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        act(async () => {
          await useCommentStore.getState().fetchComments();
        })
      ).rejects.toThrow('Network error');

      expect(useCommentStore.getState().error).toBe('Network error');
      expect(useCommentStore.getState().loading).toBe(false);
    });

    it('应该支持搜索和状态过滤', async () => {
      useCommentStore.setState({ searchTerm: 'test', statusFilter: 'spam' });
      api.get.mockResolvedValueOnce({ comments: [], total: 0 });

      await act(async () => {
        await useCommentStore.getState().fetchComments();
      });

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=test'));
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('status=spam'));
    });

    it('应该使用默认 status 和 article_title', async () => {
      api.get.mockResolvedValueOnce({
        comments: [{ id: 2, author: '无状态评论' }],
        total: 1,
      });

      await act(async () => {
        await useCommentStore.getState().fetchComments();
      });

      const comment = useCommentStore.getState().comments[0];
      expect(comment.status).toBe('normal');
      expect(comment.article_title).toBe('未知文章');
    });
  });

  describe('deleteComment', () => {
    it('应该成功删除评论并刷新列表', async () => {
      api.del.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce({ comments: [], total: 0 });

      await act(async () => {
        await useCommentStore.getState().deleteComment(1);
      });

      expect(api.del).toHaveBeenCalledWith(API_ENDPOINTS.ADMIN.DELETE_COMMENT(1));
      expect(api.get).toHaveBeenCalled();
    });
  });

  describe('updateCommentStatus', () => {
    it('应该成功更新评论状态并刷新列表', async () => {
      api.put.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce({ comments: [], total: 0 });

      await act(async () => {
        await useCommentStore.getState().updateCommentStatus(1, 'spam');
      });

      expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.ADMIN.COMMENT_STATUS(1), { status: 'spam' });
      expect(api.get).toHaveBeenCalled();
    });
  });

  describe('exportComments', () => {
    let createObjectURLSpy;

    beforeEach(() => {
      // jsdom 不支持 URL.createObjectURL / revokeObjectURL，需要先定义再 mock
      if (!global.URL.createObjectURL) {
        global.URL.createObjectURL = vi.fn();
      }
      if (!global.URL.revokeObjectURL) {
        global.URL.revokeObjectURL = vi.fn();
      }
      createObjectURLSpy = vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:mock');
      vi.spyOn(global.URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(document.body, 'appendChild').mockReturnValue({ click: vi.fn() });
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    });

    afterEach(() => {
      createObjectURLSpy.mockRestore?.();
    });

    it('应该成功导出评论（使用 api.download）', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      api.download.mockResolvedValueOnce(mockBlob);

      await act(async () => {
        await useCommentStore.getState().exportComments();
      });

      // 应该通过 api.download 下载，而非 raw fetch
      expect(api.download).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/comments/export'),
      );
    });

    it('应该在导出时传递搜索和过滤参数', async () => {
      const mockBlob = new Blob(['csv'], { type: 'text/csv' });
      api.download.mockResolvedValueOnce(mockBlob);

      useCommentStore.setState({ searchTerm: 'spam', statusFilter: 'deleted' });

      await act(async () => {
        await useCommentStore.getState().exportComments();
      });

      const [url] = api.download.mock.calls[0];
      expect(url).toContain('search=spam');
      expect(url).toContain('status=deleted');
    });

    it('应该在导出失败时抛出错误', async () => {
      api.download.mockRejectedValueOnce(new Error('导出失败'));

      await expect(
        act(async () => {
          await useCommentStore.getState().exportComments();
        })
      ).rejects.toThrow('导出失败');
    });
  });

  describe('setters', () => {
    it('setPage 应该更新页码', () => {
      useCommentStore.getState().setPage(3);
      expect(useCommentStore.getState().page).toBe(3);
    });

    it('setSearchTerm 应该更新搜索词并重置页码', () => {
      useCommentStore.setState({ page: 5 });
      useCommentStore.getState().setSearchTerm('React');
      expect(useCommentStore.getState().searchTerm).toBe('React');
      expect(useCommentStore.getState().page).toBe(1);
    });

    it('setStatusFilter 应该更新过滤器并重置页码', () => {
      useCommentStore.setState({ page: 5 });
      useCommentStore.getState().setStatusFilter('spam');
      expect(useCommentStore.getState().statusFilter).toBe('spam');
      expect(useCommentStore.getState().page).toBe(1);
    });
  });
});
