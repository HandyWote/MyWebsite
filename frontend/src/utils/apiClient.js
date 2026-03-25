// 开发模式：使用空字符串，让 Vite 代理处理 /api 请求
// 生产模式：使用空字符串，由 Nginx 代理
const BASE_URL = '';

/**
 * API 端点定义
 */
export const API_ENDPOINTS = {
  // 文章管理
  ARTICLES: '/api/admin/articles',
  ARTICLE_DETAIL: (id) => `/api/admin/articles/${id}`,
  ARTICLE_COVER: '/api/admin/articles/cover',
  ARTICLE_PDF_UPLOAD: '/api/admin/articles/pdf/upload',
  ARTICLE_AI_ANALYZE: '/api/admin/articles/ai-analyze',
  ARTICLE_BATCH_DELETE: '/api/admin/articles/batch-delete',
  ARTICLE_IMPORT_MD: '/api/admin/articles/import-md',
  // AI 设置
  AI_SETTINGS: '/api/admin/ai-settings',
  AI_SETTINGS_TEST: '/api/admin/ai-settings/test',
  // 公共资源
  ARTICLE_PDF: (filename) => `/api/articles/pdf/${filename}`,
};

/**
 * 统一的 API 请求客户端
 */
export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  // 处理 body（支持对象自动序列化）
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const payload = await response.json().catch(() => ({ message: response.statusText }));

  if (!response.ok) {
    throw new ApiError(response.status, payload.message || payload.msg || 'Request failed');
  }

  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'code') &&
    payload.code !== 0
  ) {
    throw new ApiError(response.status || 400, payload.msg || payload.message || 'Request failed');
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

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, error.message || 'Upload failed');
  }

  return response.json();
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
