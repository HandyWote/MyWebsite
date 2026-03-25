import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, api, ApiError } from './apiClient';

describe('apiClient', () => {
  // 创建真实的 localStorage 模拟
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('apiClient', () => {
    it('should make GET request with correct headers', async () => {
      const mockData = { data: { id: 1, title: 'Test' } };
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
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
      expect(result).toEqual(mockData);
    });

    it('should include Authorization header when token exists', async () => {
      localStorageMock.setItem('token', 'test-token');
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await apiClient('/api/articles');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should throw ApiError on non-ok response', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(apiClient('/api/articles/999')).rejects.toThrow(ApiError);

      // 重新 mock 用于第二个断言
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(apiClient('/api/articles/999')).rejects.toMatchObject({
        status: 404,
        message: 'Not found',
      });
    });

    it('should throw ApiError when business code is non-zero', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 400, msg: '业务失败' }),
      });

      await expect(apiClient('/api/admin/ai-settings/test')).rejects.toMatchObject({
        status: 200,
        message: '业务失败',
      });
    });
  });

  describe('api convenience methods', () => {
    it('api.get should call apiClient with GET', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.get('/api/articles');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('api.post should call apiClient with POST and body', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
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

    it('api.put should call apiClient with PUT and body', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
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

    it('api.del should call apiClient with DELETE', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.del('/api/articles/1');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/articles/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('ApiError', () => {
    it('should have status and message properties', () => {
      const error = new ApiError(404, 'Not found');

      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.name).toBe('ApiError');
    });
  });
});
