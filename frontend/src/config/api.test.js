import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  API_CONFIG,
  API_ENDPOINTS,
  getApiUrl,
  buildApiUrl,
  unwrapApiPayload,
  getApiMessage,
  downloadBlob,
  uploadFiles,
  ApiError,
} from './api.js';

describe('API Configuration', () => {
  describe('API_CONFIG', () => {
    it('should have BASE_URL defined', () => {
      expect(API_CONFIG.BASE_URL).toBeDefined();
    });

    it('should have TIMEOUT defined', () => {
      expect(API_CONFIG.TIMEOUT).toBe(10000);
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have PUBLIC endpoints', () => {
      expect(API_ENDPOINTS.PUBLIC).toBeDefined();
      expect(API_ENDPOINTS.PUBLIC.ARTICLES).toBe('/api/articles');
      expect(API_ENDPOINTS.PUBLIC.AVATAR_FILE('avatar.webp')).toBe('/api/avatars/file/avatar.webp');
    });

    it('should have ADMIN endpoints', () => {
      expect(API_ENDPOINTS.ADMIN).toBeDefined();
      expect(API_ENDPOINTS.ADMIN.LOGIN).toBe('/api/admin/login');
    });

  });

  describe('buildApiUrl', () => {
    it('should build correct URL', () => {
      const result = buildApiUrl('/api/articles');
      expect(result).toContain('/api/articles');
    });

    it('should use relative path in dev when base url is empty', () => {
      const result = buildApiUrl('/api/site-blocks');
      expect(result).toBe('/api/site-blocks');
    });
  });

  describe('getApiUrl', () => {
    it('should generate correct siteBlocks URL', () => {
      expect(getApiUrl.siteBlocks()).toContain('site-blocks');
    });

    it('should generate correct article detail URL', () => {
      const url = getApiUrl.articleDetail(123);
      expect(url).toContain('123');
    });

    it('should generate correct admin login URL', () => {
      expect(getApiUrl.adminLogin()).toContain('login');
    });

    it('should expose base URL helper', () => {
      expect(getApiUrl.baseUrl()).toBeDefined();
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

      // Mock window.location
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      await expect(downloadBlob('/api/admin/comments/export'))
        .rejects.toThrow();

      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.href).toBe('/admin/login');

      window.location = originalLocation;
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
