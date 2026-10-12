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

import { api } from '@/config/api';

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
      // mock 按请求参数返回不同数据：store 带着筛选词拉到的列表应反映筛选结果
      api.get.mockImplementation((url) => {
        const params = new URLSearchParams(url.split('?')[1]);
        if (params.get('search') === 'test' && params.get('status') === 'spam') {
          return Promise.resolve({
            comments: [{ id: 7, author: '被过滤出的垃圾评论' }],
            total: 1,
          });
        }
        return Promise.resolve({ comments: [], total: 0 });
      });

      useCommentStore.setState({ searchTerm: 'test', statusFilter: 'spam' });

      await act(async () => {
        await useCommentStore.getState().fetchComments();
      });

      const state = useCommentStore.getState();
      expect(state.comments).toEqual([
        { id: 7, author: '被过滤出的垃圾评论', status: 'normal', article_title: '未知文章' },
      ]);
      expect(state.total).toBe(1);
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
      // 预置一条评论：删除后重新拉取，若 store 忘记刷新，旧数据仍会留在列表里
      useCommentStore.setState({ comments: [{ id: 1, author: '待删评论' }], total: 1 });
      api.del.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce({ comments: [], total: 0 });

      await act(async () => {
        await useCommentStore.getState().deleteComment(1);
      });

      const state = useCommentStore.getState();
      expect(state.comments).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.loading).toBe(false);
    });
  });

  describe('updateCommentStatus', () => {
    it('应该成功更新评论状态并刷新列表', async () => {
      // 预置旧状态：更新后重新拉取，若 store 忘记刷新，旧数据仍会留在列表里
      useCommentStore.setState({ comments: [{ id: 1, author: '旧评论' }], total: 1 });
      api.put.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce({ comments: [], total: 0 });

      await act(async () => {
        await useCommentStore.getState().updateCommentStatus(1, 'spam');
      });

      const state = useCommentStore.getState();
      expect(state.comments).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.loading).toBe(false);
    });
  });

  describe('exportComments', () => {
    beforeEach(() => {
      // jsdom 不支持对象 URL，也不应在单元测试中执行真实 anchor 导航。
      if (!global.URL.createObjectURL) {
        global.URL.createObjectURL = vi.fn();
      }
      if (!global.URL.revokeObjectURL) {
        global.URL.revokeObjectURL = vi.fn();
      }
      vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:mock');
      vi.spyOn(global.URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('应该成功导出并触发浏览器下载', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });
      api.download.mockResolvedValueOnce(mockBlob);

      await act(async () => {
        await useCommentStore.getState().exportComments();
      });

      // 用户可见结果：下载已发起（anchor click），且以 csv blob 为内容
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    });

    it('导出内容应随当前筛选条件变化（search/status 请求契约）', async () => {
      // mock 按收到的 url 参数分流：store 把 searchTerm/statusFilter 传给 api.download，
      // 导出的 blob 才会对应筛选条件；丢参数 → 落到默认分支 → 内容断言失败。
      api.download.mockImplementation((url) => {
        const params = new URLSearchParams(url.split('?')[1] || '');
        const branch =
          params.get('search') === 'react' && params.get('status') === 'spam'
            ? 'filtered:spam'
            : 'all';
        return Promise.resolve(new Blob([branch], { type: 'text/csv' }));
      });

      useCommentStore.setState({ searchTerm: 'react', statusFilter: 'spam' });

      let blob;
      await act(async () => {
        await useCommentStore.getState().exportComments();
        [blob] = URL.createObjectURL.mock.calls.at(-1);
      });

      const content = await blob.text();
      expect(content).toBe('filtered:spam');
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

  describe('setters 触发的筛选行为', () => {
    it('setPage 后再次拉取应返回对应页的数据', async () => {
      api.get.mockImplementation((url) => {
        const params = new URLSearchParams(url.split('?')[1]);
        if (params.get('page') === '3') {
          return Promise.resolve({
            comments: [{ id: 30, author: '第三页评论' }],
            total: 25,
          });
        }
        return Promise.resolve({ comments: [], total: 25 });
      });

      useCommentStore.getState().setPage(3);
      await act(async () => {
        await useCommentStore.getState().fetchComments();
      });

      const state = useCommentStore.getState();
      expect(state.page).toBe(3);
      expect(state.comments).toEqual([
        { id: 30, author: '第三页评论', status: 'normal', article_title: '未知文章' },
      ]);
    });

    it('setSearchTerm 后再次拉取应返回新搜索词对应的列表并回到第一页', async () => {
      api.get.mockImplementation((url) => {
        const params = new URLSearchParams(url.split('?')[1]);
        if (params.get('search') === 'React' && params.get('page') === '1') {
          return Promise.resolve({
            comments: [{ id: 5, author: 'React 相关评论' }],
            total: 1,
          });
        }
        return Promise.resolve({ comments: [], total: 0 });
      });

      useCommentStore.setState({ page: 5 });
      useCommentStore.getState().setSearchTerm('React');
      await act(async () => {
        await useCommentStore.getState().fetchComments();
      });

      const state = useCommentStore.getState();
      expect(state.searchTerm).toBe('React');
      expect(state.page).toBe(1);
      expect(state.comments).toEqual([
        { id: 5, author: 'React 相关评论', status: 'normal', article_title: '未知文章' },
      ]);
    });

    it('setStatusFilter 后再次拉取应返回新过滤器对应的列表并回到第一页', async () => {
      api.get.mockImplementation((url) => {
        const params = new URLSearchParams(url.split('?')[1]);
        if (params.get('status') === 'spam' && params.get('page') === '1') {
          return Promise.resolve({
            comments: [{ id: 9, author: '垃圾评论' }],
            total: 1,
          });
        }
        return Promise.resolve({ comments: [], total: 0 });
      });

      useCommentStore.setState({ page: 5 });
      useCommentStore.getState().setStatusFilter('spam');
      await act(async () => {
        await useCommentStore.getState().fetchComments();
      });

      const state = useCommentStore.getState();
      expect(state.statusFilter).toBe('spam');
      expect(state.page).toBe(1);
      expect(state.comments).toEqual([
        { id: 9, author: '垃圾评论', status: 'normal', article_title: '未知文章' },
      ]);
    });
  });
});
