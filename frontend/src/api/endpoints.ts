const encodeMediaPath = (key: string) =>
  String(key)
    .split('/')
    .reduce<string[]>((segments, segment) => {
      if (segment) segments.push(encodeURIComponent(segment));
      return segments;
    }, [])
    .join('/');

export const API_ENDPOINTS = {
  PUBLIC: {
    SITE_BLOCKS: '/api/site-blocks',
    AVATARS: '/api/avatars',
    ARTICLES: '/api/articles',
    ARTICLE_DETAIL: (id: string | number) => `/api/articles/${id}`,
    ARTICLE_COMMENTS: (id: string | number) => `/api/articles/${id}/comments`,
    CREATE_COMMENT: (id: string | number) => `/api/articles/${id}/comments`,
    CATEGORIES: '/api/categories',
    TAGS: '/api/tags',
    AVATAR_FILE: (filename: string) => `/api/avatars/file/${encodeMediaPath(filename)}`,
    ARTICLE_PDF: (filename: string) => `/api/articles/pdf/${encodeMediaPath(filename)}`,
  },
  AUTH: {
    GITHUB_AUTHORIZE: '/api/auth/github/authorize',
    EXCHANGE: '/api/auth/exchange',
    ME: '/api/auth/me',
  },
  ADMIN: {
    LOGIN: '/api/admin/login',
    LOGOUT: '/api/admin/logout',
    VERIFY: () => '/api/admin/verify',
    SITE_BLOCKS: '/api/admin/site-blocks',
    AVATARS: '/api/admin/avatars',
    AVATAR_FILE: (filename: string) => `/api/admin/avatars/file/${encodeMediaPath(filename)}`,
    AVATAR_SET_CURRENT: (id: string | number) => `/api/admin/avatars/${id}/set_current`,
    AVATAR_DELETE: (id: string | number) => `/api/admin/avatars/${id}`,
    ARTICLES: '/api/admin/articles',
    ARTICLE_DETAIL: (id: string | number) => `/api/admin/articles/${id}`,
    ARTICLE_COVER: '/api/admin/articles/cover',
    ARTICLE_PDF_UPLOAD: '/api/admin/articles/pdf/upload',
    ARTICLE_PDF_DELETE: '/api/admin/articles/pdf/delete',
    ARTICLE_AI_ANALYZE: '/api/admin/articles/ai-analyze',
    ARTICLE_BATCH_DELETE: '/api/admin/articles/batch-delete',
    ARTICLE_IMPORT_MD: '/api/admin/articles/import-md',
    AI_SETTINGS: '/api/admin/ai-settings',
    AI_SETTINGS_TEST: '/api/admin/ai-settings/test',
    ADMIN_COMMENTS: '/api/admin/comments',
    DELETE_COMMENT: (id: string | number) => `/api/admin/comments/${id}`,
    COMMENT_STATUS: (id: string | number) => `/api/admin/comments/${id}/status`,
    COMMENT_EXPORT: () => '/api/admin/comments/export',
    COMMENT_LIMITS: '/api/admin/comments/limits',
    EXPORT: '/api/admin/export',
    IMPORT: '/api/admin/import',
  },
} as const;
