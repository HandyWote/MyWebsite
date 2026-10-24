import { browserApi } from './browser';
import { API_ENDPOINTS } from './endpoints';
import type { SiteBlock, SiteBlockPayload } from './types';

/** SiteBlock 领域 API：纯函数层，store 只做状态编排 */
export const siteBlockApi = {
  fetchBlocks: (): Promise<SiteBlock[]> =>
    browserApi.get<SiteBlock[]>(API_ENDPOINTS.ADMIN.SITE_BLOCKS),

  saveBlocks: (payload: SiteBlockPayload): Promise<void> =>
    browserApi.put<void>(API_ENDPOINTS.ADMIN.SITE_BLOCKS, payload),
};
