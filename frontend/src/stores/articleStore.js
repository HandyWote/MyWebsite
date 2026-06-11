// frontend/src/stores/articleStore.js
import { create } from 'zustand';
import { api, uploadFile, API_ENDPOINTS } from '@/utils/apiClient';
import { normalizeTags } from '@/utils/normalizeTags';

const useArticleStore = create((set, get) => ({
  // ========== 文章列表状态 ==========
  articles: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    perPage: 10,
    total: 0,
  },

  // ========== 当前文章（SEO 数据注入用） ==========
  currentArticle: null,

  // ========== AI 分析状态 ==========
  aiAnalysis: null,
  aiLoading: false,

  // ========== AI 设置状态 ==========
  aiSettings: null,
  aiSettingsLoading: false,

  // ========== 文章 CRUD ==========
  fetchArticles: async (params = {}) => {
    const { pagination } = get();
    const page = params.page ?? pagination.page;
    const perPage = params.perPage ?? pagination.perPage;
    const search = params.search ?? '';

    set({ loading: true, error: null });
    try {
      const query = new URLSearchParams({ page, per_page: perPage, search }).toString();
      const data = await api.get(`${API_ENDPOINTS.ARTICLES}?${query}`);

      // 处理响应格式 { code, data: { articles, total } }
      const payload = data.data || data;
      const articles = payload.articles || [];
      const total = payload.total || 0;

      set({
        articles: articles.map(article => ({
          ...article,
          tags: normalizeTags(article.tags),
        })),
        pagination: { ...pagination, page, perPage, total },
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchArticleById: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(API_ENDPOINTS.ARTICLE_DETAIL(id));
      const article = data.data || data;
      return article;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  createArticle: async (article) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post(API_ENDPOINTS.ARTICLES, article);
      // 刷新列表
      get().fetchArticles();
      return data.data || data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateArticle: async (id, article) => {
    set({ loading: true, error: null });
    try {
      const data = await api.put(API_ENDPOINTS.ARTICLE_DETAIL(id), article);
      // 刷新列表
      get().fetchArticles();
      return data.data || data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteArticle: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.del(API_ENDPOINTS.ARTICLE_DETAIL(id));
      // 刷新列表
      get().fetchArticles();
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  batchDeleteArticles: async (ids) => {
    set({ loading: true, error: null });
    try {
      await api.post(API_ENDPOINTS.ARTICLE_BATCH_DELETE, { ids });
      // 刷新列表
      get().fetchArticles();
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ========== 文件上传 ==========
  uploadCover: async (file) => {
    set({ loading: true, error: null });
    try {
      const data = await uploadFile(API_ENDPOINTS.ARTICLE_COVER, file);
      const payload = data.data || data;
      set({ loading: false });
      return payload.url;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  uploadPdf: async (file) => {
    set({ loading: true, error: null });
    try {
      const data = await uploadFile(API_ENDPOINTS.ARTICLE_PDF_UPLOAD, file);
      const payload = data.data || data;
      set({ loading: false });
      return payload.filename;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ========== 批量导入 ==========
  importMarkdown: async (files) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.ARTICLE_IMPORT_MD}`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Import failed');
      }

      const data = await response.json();
      // 刷新列表
      get().fetchArticles();
      return data.data || data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // ========== AI 功能 ==========
  analyzeContent: async (title, content, summary = '') => {
    set({ aiLoading: true, error: null });
    try {
      const data = await api.post(API_ENDPOINTS.ARTICLE_AI_ANALYZE, {
        title,
        content,
        summary,
      });
      const result = data.data || data;
      set({ aiAnalysis: result, aiLoading: false });
      return result;
    } catch (err) {
      set({ error: err.message, aiLoading: false });
      throw err;
    }
  },

  analyzeArticle: async (id) => {
    // 首先获取文章详情
    const article = await get().fetchArticleById(id);
    return get().analyzeContent(article.title, article.content, article.summary);
  },

  clearAiAnalysis: () => set({ aiAnalysis: null }),

  // ========== AI 设置 ==========
  fetchAiSettings: async () => {
    set({ aiSettingsLoading: true, error: null });
    try {
      const data = await api.get(API_ENDPOINTS.AI_SETTINGS);
      const settings = data.data || data;
      set({ aiSettings: settings, aiSettingsLoading: false });
      return settings;
    } catch (err) {
      set({ error: err.message, aiSettingsLoading: false });
      throw err;
    }
  },

  updateAiSettings: async (settings) => {
    set({ aiSettingsLoading: true, error: null });
    try {
      const data = await api.put(API_ENDPOINTS.AI_SETTINGS, settings);
      const updated = data.data || data;
      set({ aiSettings: updated, aiSettingsLoading: false });
      return updated;
    } catch (err) {
      set({ error: err.message, aiSettingsLoading: false });
      throw err;
    }
  },

  testAiConnection: async (settings) => {
    set({ aiSettingsLoading: true, error: null });
    try {
      const data = await api.post(API_ENDPOINTS.AI_SETTINGS_TEST, settings);
      set({ aiSettingsLoading: false });
      return data.data || data;
    } catch (err) {
      set({ error: err.message, aiSettingsLoading: false });
      throw err;
    }
  },

  // ========== SEO 数据注入 ==========
  setCurrentArticle: (article) => set({ currentArticle: article }),

  /**
   * 从 Go SEO 模板注入的 __INITIAL_DATA__ 读取文章数据。
   * 如果存在初始数据，直接注入 store，跳过 API 调用。
   */
  injectInitialData: () => {
    const el = document.getElementById('__INITIAL_DATA__');
    if (!el) return null;

    try {
      const article = JSON.parse(el.textContent);
      set({ currentArticle: article });
      // 清理 DOM，避免重复读取
      el.remove();
      return article;
    } catch (e) {
      console.error('[SEO] 解析 __INITIAL_DATA__ 失败:', e);
      return null;
    }
  },

  // ========== 工具方法 ==========
  getArticleById: (id) => get().articles.find((a) => a.id === id),

  setPagination: (updates) => set((state) => ({
    pagination: { ...state.pagination, ...updates },
  })),

  reset: () =>
    set({
      articles: [],
      loading: false,
      error: null,
      pagination: { page: 1, perPage: 10, total: 0 },
      aiAnalysis: null,
      aiLoading: false,
      aiSettings: null,
      aiSettingsLoading: false,
    }),
}));

export default useArticleStore;
