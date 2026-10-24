import { api, API_ENDPOINTS } from '@/config/api';

const { ARTICLE_AI_ANALYZE, AI_SETTINGS, AI_SETTINGS_TEST } =
  API_ENDPOINTS.ADMIN;

/** AI 领域 API：纯函数层，store 只做状态编排 */
export const aiApi = {
  analyzeContent: (title, content, summary = '') =>
    api.post(ARTICLE_AI_ANALYZE, { title, content, summary }),

  fetchAiSettings: () => api.get(AI_SETTINGS),

  updateAiSettings: (settings) => api.put(AI_SETTINGS, settings),

  testAiConnection: (settings) => api.post(AI_SETTINGS_TEST, settings),
};
