import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  API_ENDPOINTS,
  getApiUrl,
  buildApiUrl,
  unwrapApiPayload,
  getApiMessage,
  downloadBlob,
  uploadFiles,
  ApiError,
} from './api.js';

const { redirectToLoginMock } = vi.hoisted(() => ({ redirectToLoginMock: vi.fn() }));

vi.mock('@/api/navigation', () => ({ redirectToLogin: redirectToLoginMock }));

describe('API Configuration', () => {
  describe('API_ENDPOINTS', () => {
    it('should expose exact article list URL', () => {
      expect(API_ENDPOINTS.PUBLIC.ARTICLES).toBe('/api/articles');
      expect(API_ENDPOINTS.PUBLIC.AVATAR_FILE('avatar.webp')).toBe('/api/avatars/file/avatar.webp');
      expect(API_ENDPOINTS.PUBLIC.AVATAR_FILE('avatars/avatar 1.webp')).toBe('/api/avatars/file/avatars/avatar%201.webp');
      expect(API_ENDPOINTS.PUBLIC.ARTICLE_PDF('articles/pdfs/paper 1.pdf')).toBe('/api/articles/pdf/articles/pdfs/paper%201.pdf');
    });

    it('should expose exact admin login URL', () => {
      expect(API_ENDPOINTS.ADMIN.LOGIN).toBe('/api/admin/login');
    });

  });

  describe('buildApiUrl', () => {
    it('should pass the endpoint through unchanged', () => {
      expect(buildApiUrl('/api/articles')).toBe('/api/articles');
    });

    it('should keep query strings and encoding intact', () => {
      expect(buildApiUrl('/api/articles?page=2&per_page=20')).toBe('/api/articles?page=2&per_page=20');
    });

    it('should reject browser requests to arbitrary absolute URLs', () => {
      expect(() => buildApiUrl('https://evil.example.com/api')).toThrow('Browser API endpoint must be relative');
    });

    it('should reject browser requests to non-api paths', () => {
      expect(() => buildApiUrl('/etc/passwd')).toThrow('Browser API endpoint must be relative');
    });
  });

  describe('getApiUrl', () => {
    it('should generate exact siteBlocks URL', () => {
      expect(getApiUrl.siteBlocks()).toBe('/api/site-blocks');
    });

    it('should generate exact article detail URL', () => {
      expect(getApiUrl.articleDetail(123)).toBe('/api/articles/123');
    });

    it('should generate exact admin login URL', () => {
      expect(getApiUrl.adminLogin()).toBe('/api/admin/login');
    });

    it('should keep browser base URL empty so requests stay same-origin', () => {
      expect(getApiUrl.baseUrl()).toBe('');
    });
  });

  describe('api response helpers', () => {
    it('should unwrap code/data response payload', () => {
      const payload = unwrapApiPayload({ code: 0, data: { id: 1 } });
      expect(payload).toEqual({ id: 1 });
    });

    it('should keep raw response when payload wrapper is absent', () => {
      const payload = unwrapApiPayload({ id: 2 });
      expect(payload).toEqual({ id: 2 });
    });

    it('should resolve message from msg first', () => {
      expect(getApiMessage({ msg: '失败' })).toBe('失败');
    });
  });

  describe('downloadBlob', () => {
    let originalFetch;
    const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });

    beforeEach(() => {
      originalFetch = global.fetch;
      global.fetch = vi.fn();
      localStorage.clear();
      redirectToLoginMock.mockClear();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('应该成功下载 blob 并返回', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      const result = await downloadBlob('/api/admin/comments/export');
      expect(result).toBe(mockBlob);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 验证请求头包含 Authorization
      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers).not.toHaveProperty('Content-Type');
    });

    it('应该注入 localStorage 中的 token', async () => {
      localStorage.setItem('token', 'test-token-123');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      await downloadBlob('/api/admin/comments/export');
      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('应该在无 token 时不发送 Authorization 头', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      await downloadBlob('/api/admin/comments/export');
      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers).not.toHaveProperty('Authorization');
    });

    it('应该在非 ok 响应时抛出 ApiError', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(downloadBlob('/api/admin/comments/export'))
        .rejects.toThrow(ApiError);
    });

    it('应该在 401 时清除认证并重定向', async () => {
      localStorage.setItem('token', 'expired-token');
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(downloadBlob('/api/admin/comments/export'))
        .rejects.toThrow();

      expect(localStorage.getItem('token')).toBeNull();
      expect(redirectToLoginMock).toHaveBeenCalledTimes(1);
    });

    it('应该传递自定义 headers 和 query params', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      await downloadBlob('/api/admin/comments/export?search=test&status=spam');
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('search=test');
      expect(url).toContain('status=spam');
    });
  });

  describe('uploadFiles', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
      global.fetch = vi.fn();
      localStorage.clear();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('应该成功上传多个文件并返回解包数据', async () => {
      const file1 = new File(['hello'], 'a.md', { type: 'text/markdown' });
      const file2 = new File(['world'], 'b.md', { type: 'text/markdown' });
      const mockData = { markdown: 2, pdf: 0, failed: [] };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ code: 0, data: mockData }),
      });

      const result = await uploadFiles('/api/admin/articles/import-md', [file1, file2]);
      expect(result).toEqual(mockData);

      // 验证 FormData 被正确构建
      const [, options] = global.fetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.body).toBeInstanceOf(FormData);

      // 验证不设置 Content-Type（让浏览器自动设置 multipart boundary）
      expect(options.headers).not.toHaveProperty('Content-Type');
    });

    it('应该注入 localStorage 中的 token', async () => {
      localStorage.setItem('token', 'test-token-456');
      const file = new File(['test'], 'test.md', { type: 'text/markdown' });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ code: 0, data: {} }),
      });

      await uploadFiles('/api/admin/articles/import-md', [file]);
      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer test-token-456');
    });

    it('应该在非 ok 响应时抛出 ApiError', async () => {
      const file = new File(['test'], 'test.md', { type: 'text/markdown' });
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ message: 'Import failed' }),
      });

      await expect(uploadFiles('/api/admin/articles/import-md', [file]))
        .rejects.toThrow(ApiError);
    });

    it('应该在 code 非 0 时抛出 ApiError', async () => {
      const file = new File(['test'], 'test.md', { type: 'text/markdown' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ code: 1, msg: '业务错误' }),
      });

      await expect(uploadFiles('/api/admin/articles/import-md', [file]))
        .rejects.toThrow('业务错误');
    });

    it('应该在无 token 时不发送 Authorization 头', async () => {
      const file = new File(['test'], 'test.md', { type: 'text/markdown' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ code: 0, data: {} }),
      });

      await uploadFiles('/api/admin/articles/import-md', [file]);
      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers).not.toHaveProperty('Authorization');
    });
  });
});
