import { browserApi } from './browser';
import { API_ENDPOINTS } from './endpoints';

export const uploadApi = {
  cover: (file: File) => browserApi.upload<{ url: string }>(API_ENDPOINTS.ADMIN.ARTICLE_COVER, file),
  pdf: (file: File) => browserApi.upload<{ filename: string }>(API_ENDPOINTS.ADMIN.ARTICLE_PDF_UPLOAD, file),
  markdown: (files: File[]) => browserApi.uploadFiles<unknown>(API_ENDPOINTS.ADMIN.ARTICLE_IMPORT_MD, files, 'files'),
};
