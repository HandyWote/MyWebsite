// frontend/src/stores/articleStore.ts
import { create } from 'zustand';
import { normalizeTags } from '@/utils/normalizeTags';
import { articleApi } from '@/api/articleApi';
import type { ArticleListParams } from '@/api/articleApi';
import { withLoading } from '@/api/withLoading';
import type {
  Article,
  ArticleInput,
  ArticlePagination,
  ArticleSummary,
} from '@/api/types';

export interface ArticleState {
  /** 列表行：tags 已由 normalizeTags 归一化成数组。 */
  articles: ArticleSummary[];
  loading: boolean;
  error: string | null;
  pagination: ArticlePagination;

  fetchArticles: (params?: ArticleListParams) => Promise<void>;
  fetchArticleById: (id: number | string) => Promise<Article>;
  createArticle: (article: ArticleInput) => Promise<Article>;
  updateArticle: (id: number | string, article: ArticleInput) => Promise<Article>;
  deleteArticle: (id: number | string) => Promise<void>;
  batchDeleteArticles: (ids: Array<number | string>) => Promise<void>;

  setPagination: (updates: Partial<ArticlePagination>) => void;
  reset: () => void;
}

const useArticleStore = create<ArticleState>()((set, get) => ({
  // ========== 文章列表状态 ==========
  articles: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    perPage: 10,
    total: 0,
  },

  // ========== 文章 CRUD ==========
  fetchArticles: async (params = {}) => {
    const { pagination } = get();
    const page = params.page ?? pagination.page;
    const perPage = params.perPage ?? pagination.perPage;
    const search = params.search ?? '';

    // 与历史行为一致：列表失败时吞掉错误，只置 error 状态
    await withLoading(
      set,
      'loading',
      'error',
      async () => {
        const data = await articleApi.fetchArticles({ page, perPage, search });

        // apiClient 自动解包了 data.data
        const articles = data.articles || [];
        const total = data.total || 0;

        set({
          articles: articles.map((article) => ({
            ...article,
            // normalizeTags 的形参只收 string/数组；缺省 tags 传空字符串与传 undefined 同果（都归成 []）。
            tags: normalizeTags(article.tags ?? ''),
          })),
          pagination: { ...pagination, page, perPage, total },
        });
      },
      { rethrow: false },
    );
  },

  fetchArticleById: async (id) =>
    withLoading(set, 'loading', 'error', () => articleApi.fetchArticleById(id)),

  createArticle: async (article) =>
    withLoading(set, 'loading', 'error', async () => {
      const data = await articleApi.createArticle(article);
      get().fetchArticles();
      return data;
    }),

  updateArticle: async (id, article) =>
    withLoading(set, 'loading', 'error', async () => {
      const data = await articleApi.updateArticle(id, article);
      get().fetchArticles();
      return data;
    }),

  deleteArticle: async (id) =>
    withLoading(set, 'loading', 'error', async () => {
      await articleApi.deleteArticle(id);
      get().fetchArticles();
    }),

  batchDeleteArticles: async (ids) =>
    withLoading(set, 'loading', 'error', async () => {
      await articleApi.batchDeleteArticles(ids);
      get().fetchArticles();
    }),

  // ========== 工具方法 ==========
  setPagination: (updates) =>
    set((state) => ({
      pagination: { ...state.pagination, ...updates },
    })),

  reset: () =>
    set({
      articles: [],
      loading: false,
      error: null,
      pagination: { page: 1, perPage: 10, total: 0 },
    }),
}));

export default useArticleStore;
