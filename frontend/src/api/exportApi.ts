import { browserApi } from './browser';
import { API_ENDPOINTS } from './endpoints';
import type { ExportDataSet } from './types';

/**
 * 全站备份领域 API：ADMIN.EXPORT 导出、ADMIN.IMPORT 导入。
 *
 * 文件落盘/读取（Blob、FileReader）留在组件侧，这里只管 HTTP 契约。
 */
export const exportApi = {
  exportData: (): Promise<ExportDataSet> =>
    browserApi.get<ExportDataSet>(API_ENDPOINTS.ADMIN.EXPORT),

  importData: (payload: ExportDataSet): Promise<void> =>
    browserApi.post<void>(API_ENDPOINTS.ADMIN.IMPORT, payload),
};
