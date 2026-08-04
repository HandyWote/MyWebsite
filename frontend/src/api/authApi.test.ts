import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from './authApi';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('authApi', () => {
  it('logs in through the relative browser API and returns the JWT', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ code: 0, data: { token: 'jwt' } }) } as Response);
    await expect(authApi.login({ username: 'admin', password: 'secret', remember: true })).resolves.toEqual({ token: 'jwt' });
    expect(fetch).toHaveBeenCalledWith('/api/admin/login', expect.objectContaining({ method: 'POST', credentials: 'include' }));
  });

  it('verifies the caller-provided localStorage token', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ code: 0, data: { valid: true } }) } as Response);
    await authApi.verify('jwt');
    expect(fetch).toHaveBeenCalledWith('/api/admin/verify', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt' }) }));
  });
});
