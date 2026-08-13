import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from './authApi';
import { ApiError } from './browser';

const USER = {
  username: 'octocat',
  provider: 'github',
  avatar_url: 'https://avatars.example/octocat.png',
  display_name: 'Octo Cat',
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  window.localStorage.clear();
});

describe('authApi', () => {
  it('logs in through the relative browser API and returns the JWT', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ code: 0, data: { token: 'jwt' } }) } as Response);
    await expect(authApi.login({ username: 'admin', password: 'secret', remember: true })).resolves.toEqual({ token: 'jwt' });
    expect(fetch).toHaveBeenCalledWith('/api/admin/login', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username: 'admin', password: 'secret', remember: true }),
    }));
  });

  it('login maps a 401 to a rejected ApiError without clearing the session', async () => {
    // 凭据错误是业务结果：调用方（终端）决定重试，不应触发 browserRequest 的
    // clearAuth + 跳首页副作用。
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { code: 401, message: 'Invalid username or password' }));
    window.localStorage.setItem('token', 'keep-me');
    await expect(authApi.login({ username: 'admin', password: 'nope', remember: false })).rejects.toMatchObject({ status: 401 });
    expect(window.localStorage.getItem('token')).toBe('keep-me');
  });

  it('verifies the caller-provided localStorage token', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ code: 0, data: { valid: true } }) } as Response);
    await authApi.verify('jwt');
    expect(fetch).toHaveBeenCalledWith('/api/admin/verify', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt' }) }));
  });

  it('builds the GitHub authorize URL with an optional encoded redirect_to', () => {
    expect(authApi.buildGithubAuthorizeUrl()).toBe('/api/auth/github/authorize');
    expect(authApi.buildGithubAuthorizeUrl('/admin')).toBe('/api/auth/github/authorize?redirect_to=%2Fadmin');
    expect(authApi.buildGithubAuthorizeUrl('/posts/你好?tab=1')).toBe(
      '/api/auth/github/authorize?redirect_to=%2Fposts%2F%E4%BD%A0%E5%A5%BD%3Ftab%3D1',
    );
  });

  it('exchanges a one-time code for a JWT', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, {
      code: 0,
      data: { token: 'jwt', user: USER, redirect_to: '/admin' },
    }));

    await expect(authApi.exchange('one-time-code')).resolves.toEqual({
      token: 'jwt',
      user: USER,
      redirect_to: '/admin',
    });
    expect(fetch).toHaveBeenCalledWith('/api/auth/exchange', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ code: 'one-time-code' }),
    }));
  });

  it('me() returns null without a token and does not call fetch', async () => {
    await expect(authApi.me()).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('me() returns the user for a valid token', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { code: 0, data: USER }));
    window.localStorage.setItem('token', 'jwt');

    await expect(authApi.me()).resolves.toEqual(USER);
    expect(fetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer jwt' }),
    }));
  });

  it('me() maps a 401 to null (native fetch, no redirect side effects)', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { code: 401, message: 'unauthorized' }));
    window.localStorage.setItem('token', 'stale');

    await expect(authApi.me()).resolves.toBeNull();
    expect(window.localStorage.getItem('token')).toBe('stale');
  });

  it('me() throws ApiError on other failures', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, { message: 'boom' }));
    window.localStorage.setItem('token', 'jwt');

    await expect(authApi.me()).rejects.toBeInstanceOf(ApiError);
    await expect(authApi.me()).rejects.toMatchObject({ status: 500 });
  });
});
