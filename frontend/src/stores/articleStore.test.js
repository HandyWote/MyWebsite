// frontend/src/stores/articleStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useArticleStore from './articleStore';

// Mock config/api
vi.mock('@/config/api', () => {
  const adminEndpoints = {
    ARTICLES: '/api/admin/articles',
    ARTICLE_DETAIL: (id) => `/api/admin/articles/${id}`,
    ARTICLE_BATCH_DELETE: '/api/admin/articles/batch-delete',
  };
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
      upload: vi.fn(),
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

describe('articleStore (slim)', () => {
  beforeEach(() => {
    useArticleStore.getState().reset();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useArticleStore.getState();

      expect(state.articles).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.currentArticle).toBe(null);
      expect(state.pagination).toEqual({ page: 1, perPage: 10, total: 0 });
    });

    it('不应该包含 AI 相关状态', () => {
      const state = useArticleStore.getState();
      expect(state.aiAnalysis).toBeUndefined();
      expect(state.aiLoading).toBeUndefined();
      expect(state.aiSettings).toBeUndefined();
      expect(state.aiSettingsLoading).toBeUndefined();
    });

    it('不应该包含上传相关方法', () => {
      const state = useArticleStore.getState();
      expect(state.uploadCover).toBeUndefined();
      expect(state.uploadPdf).toBeUndefined();
      expect(state.importMarkdown).toBeUndefined();
    });

    it('不应该包含 AI 相关方法', () => {
      const state = useArticleStore.getState();
      expect(state.analyzeContent).toBeUndefined();
      expect(state.fetchAiSettings).toBeUndefined();
      expect(state.updateAiSettings).toBeUndefined();
      expect(state.testAiConnection).toBeUndefined();
      expect(state.clearAiAnalysis).toBeUndefined();
    });
  });

  describe('fetchArticles', () => {
    it('应该成功获取文章列表', async () => {
      const mockArticles = [
        { id: 1, title: 'Article 1', tags: 'tag1,tag2' },
        { id: 2, title: 'Article 2', tags: ['tag3'] },
      ];
      api.get.mockResolvedValueOnce({ articles: mockArticles, total: 2 });

      await act(async () => {
        await useArticleStore.getState().fetchArticles();
      });

      const state = useArticleStore.getState();
      expect(state.articles).toHaveLength(2);
      expect(state.articles[0].tags).toEqual(['tag1', 'tag2']);
      expect(state.articles[1].tags).toEqual(['tag3']);
      expect(state.pagination.total).toBe(2);
      expect(state.loading).toBe(false);
    });

    it('应该处理获取失败', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useArticleStore.getState().fetchArticles();
      });

      const state = useArticleStore.getState();
      expect(state.articles).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('应该支持分页参数', async () => {
      api.get.mockResolvedValueOnce({ articles: [], total: 100 });

      await act(async () => {
        await useArticleStore.getState().fetchArticles({ page: 2, perPage: 20, search: 'test' });
      });

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('per_page=20'));
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=test'));
    });
  });

  describe('fetchArticleById', () => {
    it('成功获取详情后应该重置 loading', async () => {
      api.get.mockResolvedValueOnce({ id: 1, title: 'Article 1' });

      await act(async () => {
        await useArticleStore.getState().fetchArticleById(1);
      });

      const state = useArticleStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe('createArticle', () => {
    it('应该成功创建文章', async () => {
      const newArticle = { title: 'New Article', content: 'Content' };
      const createdArticle = { id: 1, ...newArticle };
      api.post.mockResolvedValueOnce(createdArticle);
      api.get.mockResolvedValueOnce({ articles: [createdArticle], total: 1 });

      const result = await act(async () => {
        return await useArticleStore.getState().createArticle(newArticle);
      });

      expect(result).toEqual(createdArticle);
    });
  });

  describe('updateArticle', () => {
    it('应该成功更新文章', async () => {
      const updatedArticle = { id: 1, title: 'New Title', content: 'New Content' };
      api.put.mockResolvedValueOnce(updatedArticle);
      api.get.mockResolvedValueOnce({ articles: [updatedArticle], total: 1 });

      await act(async () => {
        await useArticleStore.getState().updateArticle(1, { title: 'New Title', content: 'New Content' });
      });

      expect(api.get).toHaveBeenCalled();
    });
  });

  describe('deleteArticle', () => {
    it('应该成功删除文章', async () => {
      api.del.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce({ articles: [], total: 0 });

      await act(async () => {
        await useArticleStore.getState().deleteArticle(1);
      });

      expect(api.get).toHaveBeenCalled();
    });
  });

  describe('batchDeleteArticles', () => {
    it('应该成功批量删除文章', async () => {
      api.post.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce({ articles: [], total: 0 });

      await act(async () => {
        await useArticleStore.getState().batchDeleteArticles([1, 2, 3]);
      });

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.ADMIN.ARTICLE_BATCH_DELETE, { ids: [1, 2, 3] });
    });
  });

  describe('getArticleById', () => {
    it('应该根据 ID 获取文章', () => {
      useArticleStore.setState({
        articles: [
          { id: 1, title: 'Article 1' },
          { id: 2, title: 'Article 2' },
        ],
      });

      const article = useArticleStore.getState().getArticleById(1);
      expect(article).toEqual({ id: 1, title: 'Article 1' });
    });

    it('文章不存在时应返回 undefined', () => {
      useArticleStore.setState({ articles: [] });
      const article = useArticleStore.getState().getArticleById(999);
      expect(article).toBeUndefined();
    });
  });

  describe('setPagination', () => {
    it('应该更新分页状态', () => {
      useArticleStore.getState().setPagination({ page: 2, perPage: 25 });

      const state = useArticleStore.getState();
      expect(state.pagination.page).toBe(2);
      expect(state.pagination.perPage).toBe(25);
      expect(state.pagination.total).toBe(0);
    });
  });

  describe('reset', () => {
    it('应该重置所有状态包括 currentArticle', () => {
      useArticleStore.setState({
        articles: [{ id: 1 }],
        loading: true,
        error: 'Some error',
        currentArticle: { id: 1, title: 'Test' },
        pagination: { page: 5, perPage: 20, total: 100 },
      });

      useArticleStore.getState().reset();

      const state = useArticleStore.getState();
      expect(state.articles).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.currentArticle).toBe(null);
      expect(state.pagination).toEqual({ page: 1, perPage: 10, total: 0 });
    });
  });
});
