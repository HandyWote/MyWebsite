/**
 * API配置文件 - 集中管理所有API地址
 * 
 * 这个文件负责：
 * 1. 根据环境变量动态设置API基础URL
 * 2. 定义所有API端点
 * 3. 提供便捷的URL构建方法
 * 4. 处理跨域和HTTPS问题
 * 
 * 环境变量优先级：
 * 1. VITE_API_BASE_URL (最高优先级)
 * 2. 开发环境: http://localhost:5000
 * 3. 生产环境: window.location.origin
 * 
 * 使用示例：
 * - 开发环境: VITE_API_BASE_URL=http://localhost:5000/
 * - 生产环境: VITE_API_BASE_URL=https://webbackend.handywote.site/
 */

/**
 * 获取API基础URL
 * @returns {string} API基础URL
 * 
 * 逻辑说明：
 * 1. 优先使用环境变量 VITE_API_BASE_URL
 * 2. 开发环境使用 localhost:5000
 * 3. 生产环境使用当前域名（如果未设置环境变量）
 */
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

/**
 * API基础配置
 * 
 * 包含：
 * - BASE_URL: 动态获取的API基础URL
 * - TIMEOUT: 请求超时时间（毫秒）
 */
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 10000, // 请求超时时间（毫秒）
};

/**
 * API端点配置
 * 
 * 分为三个部分：
 * 1. PUBLIC: 公共API，无需认证
 * 2. ADMIN: 管理后台API，需要JWT认证
 * 3. WEBSOCKET: WebSocket连接配置
 */
export const API_ENDPOINTS = {
  // 公共API - 无需认证，所有用户可访问
  PUBLIC: {
    SITE_BLOCKS: '/api/site-blocks',           // 网站内容块
    SKILLS: '/api/skills',                     // 技能列表
    CONTACTS: '/api/contacts',                 // 联系方式
    AVATARS: '/api/avatars',                   // 头像列表
    ARTICLES: '/api/articles',                 // 文章列表
    ARTICLE_DETAIL: (id) => `/api/articles/${id}`, // 文章详情
    ARTICLE_COMMENTS: (id) => `/api/articles/${id}/comments`,  // 获取文章评论
    CREATE_COMMENT: (id) => `/api/articles/${id}/comments`,    // 创建评论
    CATEGORIES: '/api/categories',             // 文章分类
    TAGS: '/api/tags',                         // 文章标签
    AVATAR_FILE: (filename) => `/api/admin/avatars/file/${filename}`, // 头像文件
  },
  
  // 管理后台API - 需要JWT认证
  ADMIN: {
    LOGIN: '/api/admin/login',                 // 管理员登录
    LOGOUT: '/api/admin/logout',               // 管理员登出
    SITE_BLOCKS: '/api/admin/site-blocks',     // 管理网站内容块
    SKILLS: '/api/admin/skills',               // 管理技能
    CONTACTS: '/api/admin/contacts',           // 管理联系方式
    AVATARS: '/api/admin/avatars',             // 管理头像
    AVATAR_FILE: (filename) => `/api/admin/avatars/file/${filename}`, // 头像文件
    ARTICLES: '/api/admin/articles',           // 管理文章
    ARTICLE_DETAIL: (id) => `/api/admin/articles/${id}`, // 文章详情
    ARTICLE_COVER: '/api/admin/articles/cover', // 上传文章封面
    ARTICLE_AI_ANALYZE: '/api/admin/articles/ai-analyze', // AI分析文章
    ARTICLE_BATCH_DELETE: '/api/admin/articles/batch-delete', // 批量删除文章
    ARTICLE_IMPORT_MD: '/api/admin/articles/import-md', // 导入Markdown
    ADMIN_COMMENTS: '/api/admin/comments',                   // 获取所有评论
    DELETE_COMMENT: (id) => `/api/admin/comments/${id}`,      // 删除评论
    EXPORT: '/api/admin/export',               // 导出数据
    IMPORT: '/api/admin/import',               // 导入数据
  },
  
  // WebSocket配置 - 实时通信
  WEBSOCKET: {
    // 处理URL末尾的斜杠，避免双斜杠问题
    URL: getApiBaseUrl().endsWith('/') ? getApiBaseUrl().slice(0, -1) : getApiBaseUrl(),
  },
};

/**
 * 构建完整API URL的辅助函数
 * 
 * @param {string} endpoint - API端点路径
 * @returns {string} 完整的API URL
 * 
 * 功能说明：
 * 1. 处理BASE_URL末尾的斜杠，避免双斜杠问题
 * 2. 拼接BASE_URL和endpoint，生成完整URL
 * 
 * 示例：
 * - BASE_URL: "https://api.example.com/"
 * - endpoint: "/api/articles"
 * - 结果: "https://api.example.com/api/articles"
 */
export const buildApiUrl = (endpoint) => {
  // 处理BASE_URL末尾的斜杠，避免双斜杠问题
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL.slice(0, -1) 
    : API_CONFIG.BASE_URL;
  return `${baseUrl}${endpoint}`;
};

/**
 * 获取完整API URL的便捷方法集合
 * 
 * 这个对象提供了所有API端点的便捷访问方法，
 * 使用这些方法可以避免手动拼接URL，减少错误。
 * 
 * 使用示例：
 * - getApiUrl.articles() // 获取文章列表URL
 * - getApiUrl.articleDetail(123) // 获取文章详情URL
 * - getApiUrl.adminLogin() // 获取管理员登录URL
 */
export const getApiUrl = {
  // ========== 公共API ==========
  siteBlocks: () => buildApiUrl(API_ENDPOINTS.PUBLIC.SITE_BLOCKS),           // 网站内容块
  skills: () => buildApiUrl(API_ENDPOINTS.PUBLIC.SKILLS),                     // 技能列表
  contacts: () => buildApiUrl(API_ENDPOINTS.PUBLIC.CONTACTS),                 // 联系方式
  avatars: () => buildApiUrl(API_ENDPOINTS.PUBLIC.AVATARS),                   // 头像列表
  articles: () => buildApiUrl(API_ENDPOINTS.PUBLIC.ARTICLES),                 // 文章列表
  articleDetail: (id) => buildApiUrl(API_ENDPOINTS.PUBLIC.ARTICLE_DETAIL(id)), // 文章详情
  articleComments: (id) => buildApiUrl(API_ENDPOINTS.PUBLIC.ARTICLE_COMMENTS(id)),  // 获取文章评论
  createComment: (id) => buildApiUrl(API_ENDPOINTS.PUBLIC.CREATE_COMMENT(id)),      // 创建评论
  categories: () => buildApiUrl(API_ENDPOINTS.PUBLIC.CATEGORIES),             // 文章分类
  tags: () => buildApiUrl(API_ENDPOINTS.PUBLIC.TAGS),                         // 文章标签
  avatarFile: (filename) => buildApiUrl(API_ENDPOINTS.PUBLIC.AVATAR_FILE(filename)), // 头像文件
  
  // ========== 管理后台API ==========
  adminLogin: () => buildApiUrl(API_ENDPOINTS.ADMIN.LOGIN),                   // 管理员登录
  adminLogout: () => buildApiUrl(API_ENDPOINTS.ADMIN.LOGOUT),                 // 管理员登出
  adminSiteBlocks: () => buildApiUrl(API_ENDPOINTS.ADMIN.SITE_BLOCKS),       // 管理网站内容块
  adminSkills: () => buildApiUrl(API_ENDPOINTS.ADMIN.SKILLS),                 // 管理技能
  adminContacts: () => buildApiUrl(API_ENDPOINTS.ADMIN.CONTACTS),             // 管理联系方式
  adminAvatars: () => buildApiUrl(API_ENDPOINTS.ADMIN.AVATARS),               // 管理头像
  adminAvatarFile: (filename) => buildApiUrl(API_ENDPOINTS.ADMIN.AVATAR_FILE(filename)), // 头像文件
  adminArticles: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLES),             // 管理文章
  adminArticleDetail: (id) => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_DETAIL(id)),
  adminArticleCover: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_COVER),
  adminArticleAiAnalyze: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_AI_ANALYZE),
  adminArticleBatchDelete: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_BATCH_DELETE),
  adminArticleImportMd: () => buildApiUrl(API_ENDPOINTS.ADMIN.ARTICLE_IMPORT_MD),
  adminComments: () => buildApiUrl(API_ENDPOINTS.ADMIN.ADMIN_COMMENTS),              // 获取所有评论
  deleteComment: (id) => buildApiUrl(API_ENDPOINTS.ADMIN.DELETE_COMMENT(id)),         // 删除评论
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
