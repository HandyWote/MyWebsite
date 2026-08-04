import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBackendInternalUrl, serverRequest, ServerApiError } from './server';

describe('server API', () => {
  afterEach(() => {
    delete process.env.BACKEND_INTERNAL_URL;
    vi.unstubAllGlobals();
  });

  it('uses BACKEND_INTERNAL_URL and unwraps backend envelopes', async () => {
    process.env.BACKEND_INTERNAL_URL = 'http://backend:5000/';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 0, data: { id: 7 } }),
    }));
    await expect(serverRequest<{ id: number }>('/api/articles/7')).resolves.toEqual({ id: 7 });
    expect(fetch).toHaveBeenCalledWith('http://backend:5000/api/articles/7', expect.objectContaining({ cache: 'force-cache' }));
    expect(getBackendInternalUrl()).toBe('http://backend:5000');
  });

  it('passes explicit Next cache tags and revalidation to fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 0, data: [] }),
    }));

    await serverRequest('/api/articles', {
      cache: 'force-cache',
      next: { revalidate: 86400, tags: ['articles:list'] },
    });

    expect(fetch).toHaveBeenCalledWith('http://localhost:5000/api/articles', expect.objectContaining({
      cache: 'force-cache',
      next: { revalidate: 86400, tags: ['articles:list'] },
    }));
  });

  it('rejects browser or arbitrary URLs at the server boundary', async () => {
    await expect(serverRequest('https://example.com/api')).rejects.toThrow('must start with /api/');
  });

  it('preserves backend status in ServerApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'missing' }),
    }));
    await expect(serverRequest('/api/articles/404')).rejects.toMatchObject({ status: 404, message: 'missing' } satisfies Partial<ServerApiError>);
  });
});
