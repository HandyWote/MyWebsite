import { browserApi } from './browser';
import { API_ENDPOINTS } from './endpoints';
import type { Article, ArticleInput, ArticlePage } from './types';

/** 文章列表查询参数（缺省值与旧实现一致：第 1 页、每页 10 条、空搜索）。 */
export interface ArticleListParams {
  page?: number;
  perPage?: number;
  search?: string;
}

/** 文章领域 API：纯函数层，store 只做状态编排 */
export const articleApi = {
  fetchArticles: (params: ArticleListParams = {}): Promise<ArticlePage> => {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      per_page: String(params.perPage ?? 10),
      search: params.search ?? '',
    }).toString();
    return browserApi.get<ArticlePage>(`${API_ENDPOINTS.ADMIN.ARTICLES}?${query}`);
  },

  fetchArticleById: (id: number | string): Promise<Article> =>
    browserApi.get<Article>(API_ENDPOINTS.ADMIN.ARTICLE_DETAIL(id)),

  createArticle: (article: ArticleInput): Promise<Article> =>
    browserApi.post<Article>(API_ENDPOINTS.ADMIN.ARTICLES, article),

  updateArticle: (id: number | string, article: ArticleInput): Promise<Article> =>
    browserApi.put<Article>(API_ENDPOINTS.ADMIN.ARTICLE_DETAIL(id), article),

  deleteArticle: (id: number | string): Promise<void> =>
    browserApi.del<void>(API_ENDPOINTS.ADMIN.ARTICLE_DETAIL(id)),

  batchDeleteArticles: (ids: Array<number | string>): Promise<void> =>
    browserApi.post<void>(API_ENDPOINTS.ADMIN.ARTICLE_BATCH_DELETE, { ids }),
};
