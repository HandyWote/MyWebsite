import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from './useSession';

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

describe('useSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    window.localStorage.clear();
  });

  it('无 token 时初始化为 guest 且不请求 me', async () => {
    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.status).toBe('guest'));
    expect(result.current.user).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('me 请求进行中保持 loading（SSR 首帧可安全渲染）', async () => {
    let resolveFetch: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    window.localStorage.setItem('token', 'jwt-pending');

    const { result } = renderHook(() => useSession());
    expect(result.current.status).toBe('loading');

    act(() => {
      resolveFetch!(jsonResponse(200, { code: 0, data: USER }));
    });
    await waitFor(() => expect(result.current.status).toBe('authed'));
  });

  it('有 token 且 me 返回 200 时进入 authed 并携带用户信息', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { code: 0, data: USER }));
    window.localStorage.setItem('token', 'jwt-1');

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.status).toBe('authed'));
    expect(result.current.user).toEqual(USER);
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-1' }) }),
    );
  });

  it('有 token 但 me 返回 401 时清空 token 并进入 guest', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { code: 401, message: 'unauthorized' }));
    window.localStorage.setItem('token', 'stale-token');

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.status).toBe('guest'));
    expect(result.current.user).toBeNull();
    expect(window.localStorage.getItem('token')).toBeNull();
  });

  it('me 返回其他错误时降级为 guest 但保留 token，供后续 refresh 恢复', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, { message: 'boom' }));
    window.localStorage.setItem('token', 'jwt-keep');

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.status).toBe('guest'));
    expect(window.localStorage.getItem('token')).toBe('jwt-keep');
  });

  it('login 保存 token 进入 authed，logout 清除 token 回到 guest', async () => {
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe('guest'));

    act(() => {
      result.current.login('jwt-new', USER);
    });
    expect(result.current.status).toBe('authed');
    expect(result.current.user).toEqual(USER);
    expect(window.localStorage.getItem('token')).toBe('jwt-new');

    act(() => {
      result.current.logout();
    });
    expect(result.current.status).toBe('guest');
    expect(result.current.user).toBeNull();
    expect(window.localStorage.getItem('token')).toBeNull();
  });

  it('多个组件同时挂载时共享同一个 me 请求（模块级缓存）', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { code: 0, data: USER }));
    window.localStorage.setItem('token', 'jwt-1');

    const first = renderHook(() => useSession());
    const second = renderHook(() => useSession());

    await waitFor(() => expect(first.result.current.status).toBe('authed'));
    await waitFor(() => expect(second.result.current.status).toBe('authed'));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
