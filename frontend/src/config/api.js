import { API_ENDPOINTS } from '@/api/endpoints';
import {
  ApiError,
  browserApi,
  browserRequest,
  buildBrowserApiUrl,
  downloadBrowserBlob,
  getApiMessage,
  unwrapApiPayload,
  uploadBrowserFile,
} from '@/api/browser';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from './siteBlocks';

export { API_ENDPOINTS, ApiError, getApiMessage, unwrapApiPayload };

export const API_CONFIG = { BASE_URL: '', TIMEOUT: 10000 };
export const buildApiUrl = buildBrowserApiUrl;

export const getApiUrl = {
  siteBlocks: () => API_ENDPOINTS.PUBLIC.SITE_BLOCKS,
  avatars: () => API_ENDPOINTS.PUBLIC.AVATARS,
  articles: () => API_ENDPOINTS.PUBLIC.ARTICLES,
  articleDetail: (id) => API_ENDPOINTS.PUBLIC.ARTICLE_DETAIL(id),
  articleComments: (id) => API_ENDPOINTS.PUBLIC.ARTICLE_COMMENTS(id),
  createComment: (id) => API_ENDPOINTS.PUBLIC.CREATE_COMMENT(id),
  categories: () => API_ENDPOINTS.PUBLIC.CATEGORIES,
  tags: () => API_ENDPOINTS.PUBLIC.TAGS,
  avatarFile: (filename) => API_ENDPOINTS.PUBLIC.AVATAR_FILE(filename),
  articlePdf: (filename) => API_ENDPOINTS.PUBLIC.ARTICLE_PDF(filename),
  adminLogin: () => API_ENDPOINTS.ADMIN.LOGIN,
  adminLogout: () => API_ENDPOINTS.ADMIN.LOGOUT,
  adminVerify: () => API_ENDPOINTS.ADMIN.VERIFY(),
  adminSiteBlocks: () => API_ENDPOINTS.ADMIN.SITE_BLOCKS,
  adminAvatars: () => API_ENDPOINTS.ADMIN.AVATARS,
  adminAvatarFile: (filename) => API_ENDPOINTS.ADMIN.AVATAR_FILE(filename),
  adminAvatarSetCurrent: (id) => API_ENDPOINTS.ADMIN.AVATAR_SET_CURRENT(id),
  adminAvatarDelete: (id) => API_ENDPOINTS.ADMIN.AVATAR_DELETE(id),
  adminArticles: () => API_ENDPOINTS.ADMIN.ARTICLES,
  adminArticleDetail: (id) => API_ENDPOINTS.ADMIN.ARTICLE_DETAIL(id),
  adminArticleCover: () => API_ENDPOINTS.ADMIN.ARTICLE_COVER,
  adminArticlePdfUpload: () => API_ENDPOINTS.ADMIN.ARTICLE_PDF_UPLOAD,
  adminArticlePdfDelete: () => API_ENDPOINTS.ADMIN.ARTICLE_PDF_DELETE,
  adminArticleAiAnalyze: () => API_ENDPOINTS.ADMIN.ARTICLE_AI_ANALYZE,
  adminArticleBatchDelete: () => API_ENDPOINTS.ADMIN.ARTICLE_BATCH_DELETE,
  adminArticleImportMd: () => API_ENDPOINTS.ADMIN.ARTICLE_IMPORT_MD,
  adminAiSettings: () => API_ENDPOINTS.ADMIN.AI_SETTINGS,
  adminAiSettingsTest: () => API_ENDPOINTS.ADMIN.AI_SETTINGS_TEST,
  adminComments: () => API_ENDPOINTS.ADMIN.ADMIN_COMMENTS,
  deleteComment: (id) => API_ENDPOINTS.ADMIN.DELETE_COMMENT(id),
  adminCommentStatus: (id) => API_ENDPOINTS.ADMIN.COMMENT_STATUS(id),
  adminCommentExport: () => API_ENDPOINTS.ADMIN.COMMENT_EXPORT(),
  adminCommentLimits: () => API_ENDPOINTS.ADMIN.COMMENT_LIMITS,
  adminExport: () => API_ENDPOINTS.ADMIN.EXPORT,
  adminImport: () => API_ENDPOINTS.ADMIN.IMPORT,
  baseUrl: () => '',
};

export const apiClient = browserRequest;
export const uploadFile = (endpoint, file, fieldName = 'file') => uploadBrowserFile(endpoint, file, fieldName);
export const uploadFiles = (endpoint, files, fieldName = 'files') => uploadBrowserFile(endpoint, files, fieldName);
export const downloadBlob = downloadBrowserBlob;
export const api = browserApi;

export { getBlockContent, SITE_BLOCK_DEFAULTS };

export default {
  API_CONFIG,
  API_ENDPOINTS,
  getApiUrl,
  buildApiUrl,
  unwrapApiPayload,
  getApiMessage,
  apiClient,
  uploadFile,
  downloadBlob,
  uploadFiles,
  api,
  ApiError,
  getBlockContent,
  SITE_BLOCK_DEFAULTS,
};
