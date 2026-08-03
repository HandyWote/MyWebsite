import { api, API_ENDPOINTS } from '@/config/api';

/** SiteBlock 领域 API：纯函数层，store 只做状态编排 */
export const siteBlockApi = {
  fetchBlocks: () => api.get(API_ENDPOINTS.ADMIN.SITE_BLOCKS),

  saveBlocks: (payload) => api.put(API_ENDPOINTS.ADMIN.SITE_BLOCKS, payload),
};
