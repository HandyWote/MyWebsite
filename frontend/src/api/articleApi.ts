import { api, API_ENDPOINTS } from '@/config/api';

const { ARTICLES, ARTICLE_DETAIL, ARTICLE_BATCH_DELETE } = API_ENDPOINTS.ADMIN;

/** 文章领域 API：纯函数层，store 只做状态编排 */
export const articleApi = {
  fetchArticles: (params = {}) => {
    const query = new URLSearchParams({
      page: params.page ?? 1,
      per_page: params.perPage ?? 10,
      search: params.search ?? '',
    }).toString();
    return api.get(`${ARTICLES}?${query}`);
  },

  fetchArticleById: (id) => api.get(ARTICLE_DETAIL(id)),

  createArticle: (article) => api.post(ARTICLES, article),

  updateArticle: (id, article) => api.put(ARTICLE_DETAIL(id), article),

  deleteArticle: (id) => api.del(ARTICLE_DETAIL(id)),

  batchDeleteArticles: (ids) => api.post(ARTICLE_BATCH_DELETE, { ids }),
};
