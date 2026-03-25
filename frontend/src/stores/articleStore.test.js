// frontend/src/stores/articleStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useArticleStore from './articleStore';

// Mock apiClient
vi.mock('@/utils/apiClient', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    upload: vi.fn(),
  },
  uploadFile: vi.fn(),
  API_ENDPOINTS: {
    ARTICLES: '/api/admin/articles',
    ARTICLE_DETAIL: (id) => `/api/admin/articles/${id}`,
    ARTICLE_COVER: '/api/admin/articles/cover',
    ARTICLE_PDF_UPLOAD: '/api/admin/articles/pdf/upload',
    ARTICLE_AI_ANALYZE: '/api/admin/articles/ai-analyze',
    ARTICLE_BATCH_DELETE: '/api/admin/articles/batch-delete',
    ARTICLE_IMPORT_MD: '/api/admin/articles/import-md',
    AI_SETTINGS: '/api/admin/ai-settings',
    AI_SETTINGS_TEST: '/api/admin/ai-settings/test',
    ARTICLE_PDF: (filename) => `/api/articles/pdf/${filename}`,
  },
}));

import { api, uploadFile, API_ENDPOINTS } from '@/utils/apiClient';

// Mock fetch for importMarkdown
global.fetch = vi.fn();

describe('articleStore', () => {
  beforeEach(() => {
    // 重置 store 状态
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
      expect(state.aiAnalysis).toBe(null);
      expect(state.aiLoading).toBe(false);
      expect(state.aiSettings).toBe(null);
      expect(state.aiSettingsLoading).toBe(false);
      expect(state.pagination).toEqual({ page: 1, perPage: 10, total: 0 });
    });
  });

  describe('fetchArticles', () => {
    it('应该成功获取文章列表', async () => {
      const mockArticles = [
        { id: 1, title: 'Article 1', tags: 'tag1,tag2' },
        { id: 2, title: 'Article 2', tags: ['tag3'] },
      ];
      api.get.mockResolvedValueOnce({ data: { articles: mockArticles, total: 2 } });

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
      api.get.mockResolvedValueOnce({ data: { articles: [], total: 100 } });

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
      api.get.mockResolvedValueOnce({ data: { id: 1, title: 'Article 1' } });

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
      api.post.mockResolvedValueOnce({ data: createdArticle });
      api.get.mockResolvedValueOnce({ data: { articles: [createdArticle], total: 1 } });

      const result = await act(async () => {
        return await useArticleStore.getState().createArticle(newArticle);
      });

      expect(result).toEqual(createdArticle);
    });
  });

  describe('updateArticle', () => {
    it('应该成功更新文章', async () => {
      useArticleStore.setState({
        articles: [{ id: 1, title: 'Old Title', content: 'Old Content' }],
      });

      const updatedArticle = { id: 1, title: 'New Title', content: 'New Content' };
      api.put.mockResolvedValueOnce({ data: updatedArticle });
      api.get.mockResolvedValueOnce({ data: { articles: [updatedArticle], total: 1 } });

      await act(async () => {
        await useArticleStore.getState().updateArticle(1, { title: 'New Title', content: 'New Content' });
      });

      // fetchArticles 会被调用刷新列表
      expect(api.get).toHaveBeenCalled();
    });
  });

  describe('deleteArticle', () => {
    it('应该成功删除文章', async () => {
      useArticleStore.setState({
        articles: [
          { id: 1, title: 'Article 1' },
          { id: 2, title: 'Article 2' },
        ],
      });

      api.del.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce({ data: { articles: [{ id: 2, title: 'Article 2' }], total: 1 } });

      await act(async () => {
        await useArticleStore.getState().deleteArticle(1);
      });

      // fetchArticles 会被调用刷新列表
      expect(api.get).toHaveBeenCalled();
    });
  });

  describe('batchDeleteArticles', () => {
    it('应该成功批量删除文章', async () => {
      api.post.mockResolvedValueOnce({});
      api.get.mockResolvedValueOnce({ data: { articles: [], total: 0 } });

      await act(async () => {
        await useArticleStore.getState().batchDeleteArticles([1, 2, 3]);
      });

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.ARTICLE_BATCH_DELETE, { ids: [1, 2, 3] });
    });
  });

  describe('importMarkdown', () => {
    it('导入请求不应该硬编码 localhost', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { markdown: 1, pdf: 0, failed: [] } }),
      });
      api.get.mockResolvedValueOnce({ data: { articles: [], total: 0 } });

      const files = [new File(['# hello'], 'a.md', { type: 'text/markdown' })];
      await act(async () => {
        await useArticleStore.getState().importMarkdown(files);
      });

      const [requestUrl] = global.fetch.mock.calls[0];
      expect(requestUrl).toBe(API_ENDPOINTS.ARTICLE_IMPORT_MD);
      expect(requestUrl).not.toContain('localhost:5000');
    });
  });

  describe('uploadCover', () => {
    it('应该成功上传封面', async () => {
      const mockFile = new File(['test'], 'cover.jpg', { type: 'image/jpeg' });
      uploadFile.mockResolvedValueOnce({ data: { url: '/uploads/cover.jpg' } });

      const result = await act(async () => {
        return await useArticleStore.getState().uploadCover(mockFile);
      });

      expect(result).toBe('/uploads/cover.jpg');
      expect(uploadFile).toHaveBeenCalledWith(API_ENDPOINTS.ARTICLE_COVER, mockFile);
    });

    it('应该处理上传失败', async () => {
      const mockFile = new File(['test'], 'cover.jpg', { type: 'image/jpeg' });
      uploadFile.mockRejectedValueOnce(new Error('Upload failed'));

      await expect(
        act(async () => {
          await useArticleStore.getState().uploadCover(mockFile);
        })
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('uploadPdf', () => {
    it('应该成功上传PDF', async () => {
      const mockFile = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
      uploadFile.mockResolvedValueOnce({ data: { filename: 'doc.pdf' } });

      const result = await act(async () => {
        return await useArticleStore.getState().uploadPdf(mockFile);
      });

      expect(result).toBe('doc.pdf');
      expect(uploadFile).toHaveBeenCalledWith(API_ENDPOINTS.ARTICLE_PDF_UPLOAD, mockFile);
    });
  });

  describe('analyzeContent', () => {
    it('应该成功分析内容', async () => {
      const mockAnalysis = {
        category: '技术',
        tags: ['React', 'Zustand'],
        suggested_summary: '这是一篇关于状态管理的文章',
      };
      api.post.mockResolvedValueOnce({ data: mockAnalysis });

      const result = await act(async () => {
        return await useArticleStore.getState().analyzeContent('标题', '内容', '摘要');
      });

      const state = useArticleStore.getState();
      expect(state.aiAnalysis).toEqual(mockAnalysis);
      expect(state.aiLoading).toBe(false);
      expect(result).toEqual(mockAnalysis);
    });

    it('应该处理分析失败', async () => {
      api.post.mockRejectedValueOnce(new Error('AI service unavailable'));

      await expect(
        act(async () => {
          await useArticleStore.getState().analyzeContent('标题', '内容');
        })
      ).rejects.toThrow('AI service unavailable');

      const state = useArticleStore.getState();
      expect(state.aiLoading).toBe(false);
      expect(state.error).toBe('AI service unavailable');
    });
  });

  describe('fetchAiSettings', () => {
    it('应该成功获取AI设置', async () => {
      const mockSettings = { model: 'gpt-4', base_url: 'https://api.openai.com' };
      api.get.mockResolvedValueOnce({ data: mockSettings });

      const result = await act(async () => {
        return await useArticleStore.getState().fetchAiSettings();
      });

      const state = useArticleStore.getState();
      expect(state.aiSettings).toEqual(mockSettings);
      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateAiSettings', () => {
    it('应该成功更新AI设置', async () => {
      const updatedSettings = { model: 'gpt-4-turbo', base_url: 'https://api.openai.com' };
      api.put.mockResolvedValueOnce({ data: updatedSettings });

      const result = await act(async () => {
        return await useArticleStore.getState().updateAiSettings(updatedSettings);
      });

      const state = useArticleStore.getState();
      expect(state.aiSettings).toEqual(updatedSettings);
      expect(result).toEqual(updatedSettings);
    });
  });

  describe('testAiConnection', () => {
    it('应该成功测试AI连接', async () => {
      api.post.mockResolvedValueOnce({ data: { message: 'Connection successful' } });

      const result = await act(async () => {
        return await useArticleStore.getState().testAiConnection({ api_key: 'test' });
      });

      expect(result).toEqual({ message: 'Connection successful' });
    });
  });

  describe('clearAiAnalysis', () => {
    it('应该清除AI分析结果', () => {
      useArticleStore.setState({ aiAnalysis: { summary: 'test' } });

      useArticleStore.getState().clearAiAnalysis();

      expect(useArticleStore.getState().aiAnalysis).toBe(null);
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
      expect(state.pagination.total).toBe(0); // 保持不变
    });
  });

  describe('reset', () => {
    it('应该重置所有状态', () => {
      useArticleStore.setState({
        articles: [{ id: 1 }],
        loading: true,
        error: 'Some error',
        aiAnalysis: { summary: 'test' },
        aiLoading: true,
        aiSettings: { model: 'gpt-4' },
        aiSettingsLoading: true,
        pagination: { page: 5, perPage: 20, total: 100 },
      });

      useArticleStore.getState().reset();

      const state = useArticleStore.getState();
      expect(state.articles).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.aiAnalysis).toBe(null);
      expect(state.aiLoading).toBe(false);
      expect(state.aiSettings).toBe(null);
      expect(state.aiSettingsLoading).toBe(false);
      expect(state.pagination).toEqual({ page: 1, perPage: 10, total: 0 });
    });
  });
});
