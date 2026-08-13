'use client';

import { useCallback, useEffect, useState } from 'react';
import { authApi } from '@/api/authApi';
import type { UserInfo } from '@/api/authApi';
import { clearAuth } from '@/utils/auth';

export type SessionStatus = 'loading' | 'authed' | 'guest';

export interface SessionState {
  status: SessionStatus;
  user: UserInfo | null;
}

const TOKEN_KEY = 'token';

// 模块级 me() 缓存：多个组件同时挂载时共享同一个 in-flight 请求，避免重复请求。
// 请求 settle 后自动失效；login/logout 也会主动失效，防止复用旧会话的结果。
let pendingMe: Promise<UserInfo | null> | null = null;

function invalidateMeCache(): void {
  pendingMe = null;
}

function requestMe(): Promise<UserInfo | null> {
  if (!pendingMe) {
    pendingMe = authApi.me().finally(() => {
      pendingMe = null;
    });
  }
  return pendingMe;
}

// SSR 安全：localStorage 只在客户端访问（useEffect / 事件回调里调用本函数）。
function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/**
 * 公共会话状态（终端、/auth/callback、admin 共用）。
 *
 * 初始化读 localStorage token → me() 刷新；无 token 直接 guest。
 * login/logout 由调用方（终端命令等）触发，本 hook 只负责状态落地。
 */
export function useSession(): SessionState & {
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<SessionState>({ status: 'loading', user: null });

  const refresh = useCallback(async () => {
    const token = readToken();
    if (!token) {
      setState({ status: 'guest', user: null });
      return;
    }
    try {
      const user = await requestMe();
      if (user) {
        setState({ status: 'authed', user });
      } else {
        // me() 返回 null 表示 401/会话失效：清 token 降级为 guest。
        clearAuth();
        setState({ status: 'guest', user: null });
      }
    } catch {
      // 其他错误（如 5xx）：保留 token，降级为 guest，后续 refresh 可恢复。
      setState({ status: 'guest', user: null });
    }
  }, []);

  useEffect(() => {
    let active = true;
    // 通过微任务调用 refresh，满足 react-hooks/set-state-in-effect：
    // effect 体不允许同步 setState，异步回调中允许（与 RequireAuth 的 .then 模式一致）。
    void Promise.resolve().then(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const login = useCallback((token: string, user: UserInfo) => {
    invalidateMeCache();
    if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, token);
    setState({ status: 'authed', user });
  }, []);

  const logout = useCallback(() => {
    invalidateMeCache();
    clearAuth();
    setState({ status: 'guest', user: null });
  }, []);

  return { ...state, login, logout, refresh };
}
