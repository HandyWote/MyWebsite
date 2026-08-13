import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, uploadFile, api, ApiError } from '../config/api';

const { redirectToLoginMock } = vi.hoisted(() => ({ redirectToLoginMock: vi.fn() }));

vi.mock('@/api/navigation', () => ({ redirectToLogin: redirectToLoginMock }));

describe('apiClient (unified)', () => {
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = value.toString(); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; },
    };
  })();

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
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
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      const result = await apiClient('/api/articles');

      expect(globalThis.fetch).toHaveBeenCalledWith(
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
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      const result = await apiClient('/api/items');
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('token injection', () => {
    it('should include Authorization header when token exists', async () => {
      localStorageMock.setItem('token', 'my-jwt-token');
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: 'ok' }),
      });

      await apiClient('/api/articles');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-jwt-token',
          }),
        })
      );
    });

    it('should not include Authorization header when no token', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: null }),
      });

      await apiClient('/api/articles');

      const calledHeaders = globalThis.fetch.mock.calls[0][1].headers;
      expect(calledHeaders.Authorization).toBeUndefined();
    });

    it('should skip token injection when noAuth option is true', async () => {
      localStorageMock.setItem('token', 'should-be-skipped');
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { valid: true } }),
      });

      await apiClient('/api/admin/verify', { noAuth: true });

      const calledHeaders = globalThis.fetch.mock.calls[0][1].headers;
      expect(calledHeaders.Authorization).toBeUndefined();
    });
  });

  describe('401 interception', () => {
    it('should clear auth and redirect home on 401', async () => {
      localStorageMock.setItem('token', 'expired-token');
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      await expect(apiClient('/api/admin/articles')).rejects.toThrow(ApiError);

      expect(localStorageMock.getItem('token')).toBeNull();
      expect(redirectToLoginMock).toHaveBeenCalledTimes(1);
    });

    it('should not redirect on non-401 errors', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(apiClient('/api/articles/999')).rejects.toThrow(ApiError);
      expect(redirectToLoginMock).not.toHaveBeenCalled();
    });
  });

  describe('non-ok responses', () => {
    it('should throw ApiError on non-ok response with status and message', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(apiClient('/api/articles/999')).rejects.toThrow(ApiError);

      // Verify error shape
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      try {
        await apiClient('/api/articles/999');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(404);
        expect(err.message).toBe('Not found');
      }
    });

    it('should prefer msg over message for error text', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ msg: '业务错误' }),
      });

      try {
        await apiClient('/api/test');
      } catch (err) {
        expect(err.message).toBe('业务错误');
      }
    });
  });

  describe('business code errors', () => {
    it('should throw ApiError when response.ok but code != 0', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 400, msg: '业务失败' }),
      });

      try {
        await apiClient('/api/admin/ai-settings/test');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(200); // HTTP status is preserved
        expect(err.message).toBe('业务失败');
      }
    });
  });

  describe('uploadFile', () => {
    it('should send FormData with Authorization header', async () => {
      localStorageMock.setItem('token', 'upload-token');
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { url: '/uploads/test.jpg' } }),
      });

      const result = await uploadFile('/api/admin/articles/cover', mockFile);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/articles/cover'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer upload-token',
          }),
        })
      );

      // Verify body is FormData
      const callBody = globalThis.fetch.mock.calls[0][1].body;
      expect(callBody).toBeInstanceOf(FormData);

      // auto-unwrap data.data
      expect(result).toEqual({ url: '/uploads/test.jpg' });
    });

    it('should throw ApiError when upload fails', async () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: () => Promise.resolve({ message: 'File too large' }),
      });

      await expect(
        uploadFile('/api/upload', mockFile)
      ).rejects.toMatchObject({
        status: 413,
        message: 'File too large',
      });
    });
  });

  describe('api convenience methods', () => {
    beforeEach(() => {
      localStorageMock.setItem('token', 'conv-token');
      globalThis.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: 'ok' }),
      });
    });

    it('api.get should call apiClient with no method (GET)', async () => {
      await api.get('/api/articles');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer conv-token',
          }),
        })
      );
    });

    it('api.post should send POST with JSON body', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { id: 1 } }),
      });
      await api.post('/api/articles', { title: 'New' });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New' }),
        })
      );
    });

    it('api.put should send PUT with JSON body', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { id: 1 } }),
      });
      await api.put('/api/articles/1', { title: 'Updated' });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated' }),
        })
      );
    });

    it('api.del should send DELETE', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: null }),
      });
      await api.del('/api/articles/1');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('api.upload should delegate to uploadFile', async () => {
      const mockFile = new File(['x'], 'f.png', { type: 'image/png' });
      // Reset and mock fresh for upload
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 0, data: { url: '/f.png' } }),
      });

      await api.upload('/api/upload', mockFile);
      expect(globalThis.fetch).toHaveBeenCalled();
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
});
