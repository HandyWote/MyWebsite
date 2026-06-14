/**
 * API配置文件 - 集中管理所有API地址和请求工具
 *
 * 这个文件负责：
 * 1. 根据环境变量动态设置API基础URL
 * 2. 定义所有API端点（公共 + 管理后台）
 * 3. 提供便捷的URL构建方法
 * 4. 统一的 fetch 封装（apiClient）含自动 token 注入、401 拦截、响应解包
 * 5. FormData 上传封装
 * 6. 处理跨域和HTTPS问题
 *
 * 环境变量优先级：
 * 1. VITE_API_BASE_URL (最高优先级)
 * 2. 开发环境: 相对路径（通过Vite代理）
 * 3. 生产环境: window.location.origin
 *
 * 使用示例：
 * - 开发环境: VITE_API_BASE_URL=http://localhost:5000/（可选，不设置时走代理）
 * - 生产环境: VITE_API_BASE_URL=https://webbackend.handywote.site/
 */

import { getBlockContent, SITE_BLOCK_DEFAULTS } from './siteBlocks';

// ==================== URL 基础设施 ====================

/**
 * 获取API基础URL
 * @returns {string} API基础URL
 */
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (import.meta.env.DEV) {
    return '';
  }

  if (import.meta.env.PROD) {
    return '';
  }

  return window.location.origin;
};

/**
 * API基础配置
 */
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 10000,
};

/**
 * 构建完整API URL的辅助函数
 *
 * @param {string} endpoint - API端点路径
 * @returns {string} 完整的API URL
 */
export const buildApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/')
    ? API_CONFIG.BASE_URL.slice(0, -1)
    : API_CONFIG.BASE_URL;
  return `${baseUrl}${endpoint}`;
};

// ==================== 端点注册表 ====================

/**
 * API端点配置
 *
 * 分为两个部分：
 * 1. PUBLIC: 公共API，无需认证
 * 2. ADMIN: 管理后台API，需要JWT认证
 */
export const API_ENDPOINTS = {
  // 公共API - 无需认证，所有用户可访问
  PUBLIC: {
    SITE_BLOCKS: '/api/site-blocks',
    AVATARS: '/api/avatars',
    ARTICLES: '/api/articles',
    ARTICLE_DETAIL: (id) => `/api/articles/${id}`,
    ARTICLE_COMMENTS: (id) => `/api/articles/${id}/comments`,
    CREATE_COMMENT: (id) => `/api/articles/${id}/comments`,
    CATEGORIES: '/api/categories',
    TAGS: '/api/tags',
    AVATAR_FILE: (filename) => `/api/avatars/file/${filename}`,
    ARTICLE_PDF: (filename) => `/api/articles/pdf/${filename}`,
  },

  // 管理后台API - 需要JWT认证
  ADMIN: {
    LOGIN: '/api/admin/login',
    LOGOUT: '/api/admin/logout',
    VERIFY: () => '/api/admin/verify',
    SITE_BLOCKS: '/api/admin/site-blocks',
    AVATARS: '/api/admin/avatars',
    AVATAR_FILE: (filename) => `/api/admin/avatars/file/${filename}`,
    AVATAR_SET_CURRENT: (id) => `/api/admin/avatars/${id}/set_current`,
    AVATAR_DELETE: (id) => `/api/admin/avatars/${id}`,
    ARTICLES: '/api/admin/articles',
    ARTICLE_DETAIL: (id) => `/api/admin/articles/${id}`,
    ARTICLE_COVER: '/api/admin/articles/cover',
    ARTICLE_PDF_UPLOAD: '/api/admin/articles/pdf/upload',
    ARTICLE_PDF_DELETE: '/api/admin/articles/pdf/delete',
    ARTICLE_AI_ANALYZE: '/api/admin/articles/ai-analyze',
    ARTICLE_BATCH_DELETE: '/api/admin/articles/batch-delete',
    ARTICLE_IMPORT_MD: '/api/admin/articles/import-md',
    AI_SETTINGS: '/api/admin/ai-settings',
    AI_SETTINGS_TEST: '/api/admin/ai-settings/test',
    ADMIN_COMMENTS: '/api/admin/comments',
    DELETE_COMMENT: (id) => `/api/admin/comments/${id}`,
    COMMENT_STATUS: (id) => `/api/admin/comments/${id}/status`,
    COMMENT_EXPORT: () => '/api/admin/comments/export',
    COMMENT_LIMITS: '/api/admin/comments/limits',
    EXPORT: '/api/admin/export',
    IMPORT: '/api/admin/import',
  },
};

// ==================== 便捷 URL 方法 ====================

/**
 * 获取完整API URL的便捷方法集合
 */
export const getApiUrl = {
  // ========== 公共API ==========
  siteBlocks: () => buildApiUrl(API_ENDPOINTS.PUBLIC.SITE_BLOCKS),
  avatars: () => buildApiUrl(API_ENDPOINTS.PUBLIC.AVATARS),
  articles: () => buildApiUrl(API_ENDPOINTS.PUBLIC.ARTICLES),
  articleDetail: (id) => buildApiUrl(API_ENDPOINTS.PUBLIC.ARTICLE_DETAIL(id)),
  articleComments: (id) => buildApiUrl(API_ENDPOINTS.PUBLIC.ARTICLE_COMMENTS(id)),
  createComment: (id) => buildApiUrl(API_ENDPOINTS.PUBLIC.CREATE_COMMENT(id)),
  categories: () => buildApiUrl(API_ENDPOINTS.PUBLIC.CATEGORIES),
  tags: () => buildApiUrl(API_ENDPOINTS.PUBLIC.TAGS),
  avatarFile: (filename) => buildApiUrl(API_ENDPOINTS.PUBLIC.AVATAR_FILE(filename)),
  articlePdf: (filename) => buildApiUrl(API_ENDPOINTS.PUBLIC.ARTICLE_PDF(filename)),

  // ========== 管理后台API ==========
  adminLogin: () => buildApiUrl(API_ENDPOINTS.ADMIN.LOGIN),
  adminLogout: () => buildApiUrl(API_ENDPOINTS.ADMIN.LOGOUT),
  adminVerify: () => buildApiUrl(API_ENDPOINTS.ADMIN.VERIFY()),
  adminSiteBlocks: () => buildApiUrl(API_ENDPOINTS.ADMIN.SITE_BLOCKS),
  adminAvatars: () => buildApiUrl(API_ENDPOINTS.ADMIN.AVATARS),
  adminAvatarFile: (filename) => buildApiUrl(API_ENDPOINTS.ADMIN.AVATAR_FILE(filename)),
  adminAvatarSetCurrent: (id) => buildApiUrl(API_ENDPOINTS.ADMIN.AVATAR_SET_CURRENT(id)),
  adminAvatarDelete: (id) => buildApiUrl(API_ENDPOINTS.ADMIN.AVATAR_DELETE(id)),
  adminArticles: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLES),
  adminArticleDetail: (id) => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_DETAIL(id)),
  adminArticleCover: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_COVER),
  adminArticlePdfUpload: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_PDF_UPLOAD),
  adminArticlePdfDelete: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_PDF_DELETE),
  adminArticleAiAnalyze: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_AI_ANALYZE),
  adminArticleBatchDelete: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_BATCH_DELETE),
  adminArticleImportMd: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_IMPORT_MD),
  adminAiSettings: () => buildApiUrl(API_ENDPOINTS.ADMIN.AI_SETTINGS),
  adminAiSettingsTest: () => buildApiUrl(API_ENDPOINTS.ADMIN.AI_SETTINGS_TEST),
  adminComments: () => buildApiUrl(API_ENDPOINTS.ADMIN.ADMIN_COMMENTS),
  deleteComment: (id) => buildApiUrl(API_ENDPOINTS.ADMIN.DELETE_COMMENT(id)),
  adminCommentStatus: (id) => buildApiUrl(API_ENDPOINTS.ADMIN.COMMENT_STATUS(id)),
  adminCommentExport: () => buildApiUrl(API_ENDPOINTS.ADMIN.COMMENT_EXPORT()),
  adminCommentLimits: () => buildApiUrl(API_ENDPOINTS.ADMIN.COMMENT_LIMITS),
  adminExport: () => buildApiUrl(API_ENDPOINTS.ADMIN.EXPORT),
  adminImport: () => buildApiUrl(API_ENDPOINTS.ADMIN.IMPORT),

  // 基础地址（用于拼接上传文件等静态资源路径）
  baseUrl: () => API_CONFIG.BASE_URL,
};

// ==================== 响应工具函数 ====================

/**
 * 解包后端统一响应格式：
 * - 标准：{ code, data, message }
 * - 兼容：非包装结构直接返回原始对象
 */
export const unwrapApiPayload = (response) => {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return response;
  }
  if (Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data;
  }
  return response;
};

/**
 * 读取错误消息，兼容 msg / message 字段
 */
export const getApiMessage = (response, fallback = '') => {
  if (!response || typeof response !== 'object') {
    return fallback;
  }
  return response.msg || response.message || fallback;
};

// ==================== 统一 API 请求客户端 ====================

/**
 * 自定义错误类
 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * 清除认证信息（模块内使用，与 auth.js 的 clearAuth 保持一致）
 */
const clearAuth = () => {
  localStorage.removeItem('token');
};

/**
 * 统一的 API 请求客户端
 *
 * 功能：
 * - 自动从 localStorage 读取 token 并注入 Authorization header
 * - 自动检查 response.ok
 * - 401 状态码自动清除认证并重定向到 /admin/login
 * - code !== 0 自动抛出 ApiError
 * - 自动解包 data.data 返回
 * - 通过 { noAuth: true } 可跳过 token 注入（用于 login/verify 等预认证场景）
 */
export async function apiClient(endpoint, options = {}) {
  const { noAuth = false, ...fetchOptions } = options;

  const config = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(!noAuth && (() => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
      })()),
      ...fetchOptions.headers,
    },
  };

  // 处理 body（支持对象自动序列化）
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(buildApiUrl(endpoint), config);
  const payload = await response.json().catch(() => ({ message: response.statusText }));

  // 401: 清除认证并重定向
  if (response.status === 401) {
    clearAuth();
    window.location.href = '/admin/login';
  }

  if (!response.ok) {
    throw new ApiError(response.status, payload.msg || payload.message || payload.msg || 'Request failed');
  }

  // 业务错误码检查
  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'code') &&
    payload.code !== 0
  ) {
    throw new ApiError(response.status || 400, payload.msg || payload.message || 'Request failed');
  }

  // 自动解包 data.data
  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    return payload.data;
  }

  return payload;
}

/**
 * 上传文件（FormData）
 */
export async function uploadFile(endpoint, file, fieldName = 'file') {
  const token = localStorage.getItem('token');

  const formData = new FormData();
  formData.append(fieldName, file);

  const config = {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  };

  const response = await fetch(buildApiUrl(endpoint), config);
  const payload = await response.json().catch(() => ({ message: response.statusText }));

  if (!response.ok) {
    throw new ApiError(response.status, payload.message || payload.msg || 'Upload failed');
  }

  // 自动解包
  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    return payload.data;
  }

  return payload;
}

/**
 * 便捷方法
 */
export const api = {
  get: (endpoint) => apiClient(endpoint),
  post: (endpoint, data) => apiClient(endpoint, { method: 'POST', body: data }),
  put: (endpoint, data) => apiClient(endpoint, { method: 'PUT', body: data }),
  del: (endpoint) => apiClient(endpoint, { method: 'DELETE' }),
  upload: uploadFile,
};

// ==================== 默认导出 ====================

export default {
  API_CONFIG,
  API_ENDPOINTS,
  getApiUrl,
  buildApiUrl,
  unwrapApiPayload,
  getApiMessage,
  apiClient,
  uploadFile,
  api,
  ApiError,
  getBlockContent,
  SITE_BLOCK_DEFAULTS,
};

export { getBlockContent, SITE_BLOCK_DEFAULTS };
