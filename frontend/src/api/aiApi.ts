import { browserApi } from './browser';
import { API_ENDPOINTS } from './endpoints';
import type { AiSettings, AiSuggestions } from './types';

/** AI 领域 API：纯函数层，store 只做状态编排 */
export const aiApi = {
  analyzeContent: (title: string, content: string, summary = ''): Promise<AiSuggestions> =>
    browserApi.post<AiSuggestions>(API_ENDPOINTS.ADMIN.ARTICLE_AI_ANALYZE, {
      title,
      content,
      summary,
    }),

  fetchAiSettings: (): Promise<AiSettings> =>
    browserApi.get<AiSettings>(API_ENDPOINTS.ADMIN.AI_SETTINGS),

  updateAiSettings: (settings: AiSettings): Promise<AiSettings> =>
    browserApi.put<AiSettings>(API_ENDPOINTS.ADMIN.AI_SETTINGS, settings),

  testAiConnection: (settings: AiSettings): Promise<unknown> =>
    browserApi.post<unknown>(API_ENDPOINTS.ADMIN.AI_SETTINGS_TEST, settings),
};
