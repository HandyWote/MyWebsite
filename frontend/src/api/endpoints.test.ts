import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from './endpoints';

describe('API_ENDPOINTS', () => {
  it('should expose exact public article URLs', () => {
    expect(API_ENDPOINTS.PUBLIC.ARTICLES).toBe('/api/articles');
    expect(API_ENDPOINTS.PUBLIC.ARTICLE_DETAIL(123)).toBe('/api/articles/123');
    expect(API_ENDPOINTS.PUBLIC.ARTICLE_COMMENTS(123)).toBe('/api/articles/123/comments');
  });

  it('should keep media paths single-origin and path-segment encoded', () => {
    expect(API_ENDPOINTS.PUBLIC.AVATAR_FILE('avatar.webp')).toBe('/api/avatars/file/avatar.webp');
    expect(API_ENDPOINTS.PUBLIC.AVATAR_FILE('avatars/avatar 1.webp')).toBe('/api/avatars/file/avatars/avatar%201.webp');
    expect(API_ENDPOINTS.PUBLIC.ARTICLE_PDF('articles/pdfs/paper 1.pdf')).toBe('/api/articles/pdf/articles/pdfs/paper%201.pdf');
    expect(API_ENDPOINTS.ADMIN.AVATAR_FILE('avatars/avatar 1.webp')).toBe('/api/admin/avatars/file/avatars/avatar%201.webp');
  });

  it('should expose exact admin URLs', () => {
    expect(API_ENDPOINTS.ADMIN.LOGIN).toBe('/api/admin/login');
    expect(API_ENDPOINTS.ADMIN.LOGOUT).toBe('/api/admin/logout');
    expect(API_ENDPOINTS.ADMIN.SITE_BLOCKS).toBe('/api/admin/site-blocks');
    expect(API_ENDPOINTS.ADMIN.ARTICLE_DETAIL(7)).toBe('/api/admin/articles/7');
    expect(API_ENDPOINTS.ADMIN.DELETE_COMMENT(7)).toBe('/api/admin/comments/7');
    expect(API_ENDPOINTS.ADMIN.COMMENT_STATUS(7)).toBe('/api/admin/comments/7/status');
    expect(API_ENDPOINTS.ADMIN.DRAWING_SUBMISSION_APPROVE(7)).toBe('/api/admin/drawing/submissions/7/approve');
    expect(API_ENDPOINTS.ADMIN.DRAWING_SUBMISSION_REJECT(7)).toBe('/api/admin/drawing/submissions/7/reject');
    expect(API_ENDPOINTS.ADMIN.EXPORT).toBe('/api/admin/export');
    expect(API_ENDPOINTS.ADMIN.IMPORT).toBe('/api/admin/import');
  });

  it('should expose exact auth URLs', () => {
    expect(API_ENDPOINTS.AUTH.GITHUB_AUTHORIZE).toBe('/api/auth/github/authorize');
    expect(API_ENDPOINTS.AUTH.EXCHANGE).toBe('/api/auth/exchange');
    expect(API_ENDPOINTS.AUTH.ME).toBe('/api/auth/me');
  });
});
