import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  browserApi,
  browserRequest,
  buildBrowserApiUrl,
  downloadBrowserBlob,
  getApiMessage,
  unwrapApiPayload,
  uploadBrowserFile,
} from './browser';

const { redirectToLoginMock } = vi.hoisted(() => ({ redirectToLoginMock: vi.fn() }));

/** fetch 的 mock 句柄：测试里只关心「被调了什么/返回什么」，用无签名 mock 最省类型噪声。 */
const fetchMock = vi.fn();

vi.mock('@/api/navigation', () => ({ redirectToLogin: redirectToLoginMock }));

describe('browserRequest (unified transport)', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    };
  })();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();
    redirectToLoginMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('normal responses', () => {
    it('should make GET request and auto-unwrap data.data', async () => {
      const mockData = { code: 0, data: { id: 1, title: 'Test' } };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      const result = await browserRequest('/api/articles');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      // auto-unwrap: returns data.data
      expect(result).toEqual({ id: 1, title: 'Test' });
    });

    it('should return raw payload when no code/data wrapper exists', async () => {
      const mockData = { items: [1, 2, 3] };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      const result = await browserRequest('/api/items');
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('token injection', () => {
    it('should include Authorization header when token exists', async () => {
      localStorageMock.setItem('token', 'my-jwt-token');
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: 'ok' }),
      });

      await browserRequest('/api/articles');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-jwt-token',
          }),
        })
      );
    });

    it('should not include Authorization header when no token', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: null }),
      });

      await browserRequest('/api/articles');

      const calledHeaders = fetchMock.mock.calls[0][1].headers;
      expect(calledHeaders.Authorization).toBeUndefined();
    });

    it('should skip token injection when noAuth option is true', async () => {
      localStorageMock.setItem('token', 'should-be-skipped');
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { valid: true } }),
      });

      await browserRequest('/api/admin/verify', { noAuth: true });

      const calledHeaders = fetchMock.mock.calls[0][1].headers;
      expect(calledHeaders.Authorization).toBeUndefined();
    });
  });

  describe('401 interception', () => {
    it('should clear auth and redirect home on 401', async () => {
      localStorageMock.setItem('token', 'expired-token');
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      await expect(browserRequest('/api/admin/articles')).rejects.toThrow(ApiError);

      expect(localStorageMock.getItem('token')).toBeNull();
      expect(redirectToLoginMock).toHaveBeenCalledTimes(1);
    });

    it('should not redirect on non-401 errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(browserRequest('/api/articles/999')).rejects.toThrow(ApiError);
      expect(redirectToLoginMock).not.toHaveBeenCalled();
    });
  });

  describe('non-ok responses', () => {
    it('should throw ApiError on non-ok response with status and message', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(browserRequest('/api/articles/999')).rejects.toThrow(ApiError);

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      try {
        await browserRequest('/api/articles/999');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.status).toBe(404);
        expect(apiError.message).toBe('Not found');
      }
    });

    it('should prefer msg over message for error text', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ msg: '业务错误' }),
      });

      try {
        await browserRequest('/api/test');
      } catch (err) {
        expect((err as ApiError).message).toBe('业务错误');
      }
    });
  });

  describe('business code errors', () => {
    it('should throw ApiError when response.ok but code != 0', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 400, msg: '业务失败' }),
      });

      try {
        await browserRequest('/api/admin/ai-settings/test');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.status).toBe(200); // HTTP status is preserved
        expect(apiError.message).toBe('业务失败');
      }
    });
  });

  describe('uploadBrowserFile', () => {
    it('should send FormData with Authorization header', async () => {
      localStorageMock.setItem('token', 'upload-token');
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { url: '/uploads/test.jpg' } }),
      });

      const result = await uploadBrowserFile('/api/admin/articles/cover', mockFile);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/articles/cover'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer upload-token',
          }),
        })
      );

      const callBody = fetchMock.mock.calls[0][1].body;
      expect(callBody).toBeInstanceOf(FormData);
      expect(result).toEqual({ url: '/uploads/test.jpg' });
    });

    it('should throw ApiError when upload fails', async () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: () => Promise.resolve({ message: 'File too large' }),
      });

      await expect(
        uploadBrowserFile('/api/upload', mockFile)
      ).rejects.toMatchObject({
        status: 413,
        message: 'File too large',
      });
    });
  });

  describe('browserApi convenience methods', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'conv-token');
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: 'ok' }),
      });
    });

    it('get should call the transport with no method (GET)', async () => {
      await browserApi.get('/api/articles');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer conv-token',
          }),
        })
      );
    });

    it('post should send POST with JSON body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { id: 1 } }),
      });
      await browserApi.post('/api/articles', { title: 'New' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New' }),
        })
      );
    });

    it('put should send PUT with JSON body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { id: 1 } }),
      });
      await browserApi.put('/api/articles/1', { title: 'Updated' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated' }),
        })
      );
    });

    it('del should send DELETE', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: null }),
      });
      await browserApi.del('/api/articles/1');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('upload should delegate to the file transport', async () => {
      const mockFile = new File(['x'], 'f.png', { type: 'image/png' });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { url: '/f.png' } }),
      });

      await browserApi.upload('/api/upload', mockFile);
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('ApiError class', () => {
    it('should have status and message properties', () => {
      const error = new ApiError(404, 'Not found');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.name).toBe('ApiError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('response helpers', () => {
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

  describe('buildBrowserApiUrl', () => {
    it('should pass the endpoint through unchanged', () => {
      expect(buildBrowserApiUrl('/api/articles')).toBe('/api/articles');
    });

    it('should keep query strings and encoding intact', () => {
      expect(buildBrowserApiUrl('/api/articles?page=2&per_page=20')).toBe('/api/articles?page=2&per_page=20');
    });

    it('should reject browser requests to arbitrary absolute URLs', () => {
      expect(() => buildBrowserApiUrl('https://evil.example.com/api')).toThrow('Browser API endpoint must be relative');
    });

    it('should reject browser requests to non-api paths', () => {
      expect(() => buildBrowserApiUrl('/etc/passwd')).toThrow('Browser API endpoint must be relative');
    });
  });
});

describe('downloadBrowserBlob / uploadFiles', () => {
  let originalFetch: typeof globalThis.fetch;
  const mockBlob = new Blob(['csv,data'], { type: 'text/csv' });

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    fetchMock.mockReset();
    localStorage.clear();
    redirectToLoginMock.mockClear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('应该成功下载 blob 并返回', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    const result = await downloadBrowserBlob('/api/admin/comments/export');
    expect(result).toBe(mockBlob);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).not.toHaveProperty('Content-Type');
  });

  it('应该注入 localStorage 中的 token', async () => {
    localStorage.setItem('token', 'test-token-123');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    await downloadBrowserBlob('/api/admin/comments/export');
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer test-token-123');
  });

  it('应该在无 token 时不发送 Authorization 头', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    await downloadBrowserBlob('/api/admin/comments/export');
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).not.toHaveProperty('Authorization');
  });

  it('应该在非 ok 响应时抛出 ApiError', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(downloadBrowserBlob('/api/admin/comments/export'))
      .rejects.toThrow(ApiError);
  });

  it('应该在 401 时清除认证并重定向', async () => {
    localStorage.setItem('token', 'expired-token');
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(downloadBrowserBlob('/api/admin/comments/export'))
      .rejects.toThrow();

    expect(localStorage.getItem('token')).toBeNull();
    expect(redirectToLoginMock).toHaveBeenCalledTimes(1);
  });

  it('应该传递查询参数给下载端点', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    await downloadBrowserBlob('/api/admin/comments/export?search=test&status=spam');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('search=test');
    expect(url).toContain('status=spam');
  });

  it('uploadFiles 应该成功上传多个文件并返回解包数据', async () => {
    const file1 = new File(['hello'], 'a.md', { type: 'text/markdown' });
    const file2 = new File(['world'], 'b.md', { type: 'text/markdown' });
    const mockData = { markdown: 2, pdf: 0, failed: [] };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ code: 0, data: mockData }),
    });

    const result = await browserApi.uploadFiles('/api/admin/articles/import-md', [file1, file2]);
    expect(result).toEqual(mockData);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    // 不设置 Content-Type，让浏览器自动带 multipart boundary
    expect(options.headers).not.toHaveProperty('Content-Type');
  });

  it('uploadFiles 应该注入 localStorage 中的 token', async () => {
    localStorage.setItem('token', 'test-token-456');
    const file = new File(['test'], 'test.md', { type: 'text/markdown' });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ code: 0, data: {} }),
    });

    await browserApi.uploadFiles('/api/admin/articles/import-md', [file]);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer test-token-456');
  });

  it('uploadFiles 应该在非 ok 响应时抛出 ApiError', async () => {
    const file = new File(['test'], 'test.md', { type: 'text/markdown' });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ message: 'Import failed' }),
    });

    await expect(browserApi.uploadFiles('/api/admin/articles/import-md', [file]))
      .rejects.toThrow(ApiError);
  });

  it('uploadFiles 应该在 code 非 0 时抛出 ApiError', async () => {
    const file = new File(['test'], 'test.md', { type: 'text/markdown' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ code: 1, msg: '业务错误' }),
    });

    await expect(browserApi.uploadFiles('/api/admin/articles/import-md', [file]))
      .rejects.toThrow('业务错误');
  });

  it('uploadFiles 应该在无 token 时不发送 Authorization 头', async () => {
    const file = new File(['test'], 'test.md', { type: 'text/markdown' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ code: 0, data: {} }),
    });

    await browserApi.uploadFiles('/api/admin/articles/import-md', [file]);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).not.toHaveProperty('Authorization');
  });
});
