// API配置文件 - 集中管理所有API地址

// 根据环境变量或默认值设置API基础URL
const getApiBaseUrl = () => {
  // 优先使用环境变量（开发和生产环境都优先使用）
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 开发环境默认值
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  
  // 生产环境默认值 - 使用当前域名
  if (import.meta.env.PROD) {
    // 生产环境默认使用当前域名，假设API在同一域名下
    return window.location.origin;
  }
  
  // 其他情况默认值
  return window.location.origin;
};

// API基础配置
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 10000, // 请求超时时间（毫秒）
};

// API端点配置
export const API_ENDPOINTS = {
  // 公共API
  PUBLIC: {
    SITE_BLOCKS: '/api/site-blocks',
    SKILLS: '/api/skills',
    CONTACTS: '/api/contacts',
    AVATARS: '/api/avatars',
    ARTICLES: '/api/articles',
    ARTICLE_DETAIL: (id) => `/api/articles/${id}`,
    CATEGORIES: '/api/categories',
    TAGS: '/api/tags',
    AVATAR_FILE: (filename) => `/api/admin/avatars/file/${filename}`,
  },
  
  // 管理后台API
  ADMIN: {
    LOGIN: '/api/admin/login',
    LOGOUT: '/api/admin/logout',
    SITE_BLOCKS: '/api/admin/site-blocks',
    SKILLS: '/api/admin/skills',
    CONTACTS: '/api/admin/contacts',
    AVATARS: '/api/admin/avatars',
    AVATAR_FILE: (filename) => `/api/admin/avatars/file/${filename}`,
    ARTICLES: '/api/admin/articles',
    ARTICLE_DETAIL: (id) => `/api/admin/articles/${id}`,
    ARTICLE_COVER: '/api/admin/articles/cover',
    ARTICLE_AI_ANALYZE: '/api/admin/articles/ai-analyze',
    ARTICLE_BATCH_DELETE: '/api/admin/articles/batch-delete',
    ARTICLE_IMPORT_MD: '/api/admin/articles/import-md',
    EXPORT: '/api/admin/export',
    IMPORT: '/api/admin/import',
  },
  
  // WebSocket配置
  WEBSOCKET: {
    URL: getApiBaseUrl().endsWith('/') ? getApiBaseUrl().slice(0, -1) : getApiBaseUrl(),
  },
};

// 构建完整API URL的辅助函数
export const buildApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL.slice(0, -1) 
    : API_CONFIG.BASE_URL;
  return `${baseUrl}${endpoint}`;
};

// 获取完整API URL的便捷方法
export const getApiUrl = {
  // 公共API
  siteBlocks: () => buildApiUrl(API_ENDPOINTS.PUBLIC.SITE_BLOCKS),
  skills: () => buildApiUrl(API_ENDPOINTS.PUBLIC.SKILLS),
  contacts: () => buildApiUrl(API_ENDPOINTS.PUBLIC.CONTACTS),
  avatars: () => buildApiUrl(API_ENDPOINTS.PUBLIC.AVATARS),
  articles: () => buildApiUrl(API_ENDPOINTS.PUBLIC.ARTICLES),
  articleDetail: (id) => buildApiUrl(API_ENDPOINTS.PUBLIC.ARTICLE_DETAIL(id)),
  categories: () => buildApiUrl(API_ENDPOINTS.PUBLIC.CATEGORIES),
  tags: () => buildApiUrl(API_ENDPOINTS.PUBLIC.TAGS),
  avatarFile: (filename) => buildApiUrl(API_ENDPOINTS.PUBLIC.AVATAR_FILE(filename)),
  
  // 管理后台API
  adminLogin: () => buildApiUrl(API_ENDPOINTS.ADMIN.LOGIN),
  adminLogout: () => buildApiUrl(API_ENDPOINTS.ADMIN.LOGOUT),
  adminSiteBlocks: () => buildApiUrl(API_ENDPOINTS.ADMIN.SITE_BLOCKS),
  adminSkills: () => buildApiUrl(API_ENDPOINTS.ADMIN.SKILLS),
  adminContacts: () => buildApiUrl(API_ENDPOINTS.ADMIN.CONTACTS),
  adminAvatars: () => buildApiUrl(API_ENDPOINTS.ADMIN.AVATARS),
  adminAvatarFile: (filename) => buildApiUrl(API_ENDPOINTS.ADMIN.AVATAR_FILE(filename)),
  adminArticles: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLES),
  adminArticleDetail: (id) => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_DETAIL(id)),
  adminArticleCover: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_COVER),
  adminArticleAiAnalyze: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_AI_ANALYZE),
  adminArticleBatchDelete: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_BATCH_DELETE),
  adminArticleImportMd: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_IMPORT_MD),
  adminExport: () => buildApiUrl(API_ENDPOINTS.ADMIN.EXPORT),
  adminImport: () => buildApiUrl(API_ENDPOINTS.ADMIN.IMPORT),
  
  // WebSocket
  websocket: () => API_CONFIG.BASE_URL,
};

// 默认导出配置对象
export default {
  API_CONFIG,
  API_ENDPOINTS,
  getApiUrl,
  buildApiUrl,
}; 