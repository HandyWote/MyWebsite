import { API_ENDPOINTS } from './endpoints';
import { browserRequest } from './browser';
import { ApiError, getApiMessage, unwrapApiPayload, type ApiEnvelope } from './browser';

/** 当前登录用户（GitHub OAuth 或管理员），与 GET /api/auth/me 的响应一致。 */
export interface UserInfo {
  username: string;
  provider: string;
  avatar_url?: string;
  display_name?: string;
}

interface LoginResponse {
  token: string;
}

interface VerifyResponse {
  valid: boolean;
}

/** POST /api/auth/exchange 的响应：一次性 code 换 JWT + 用户信息 + 回跳路径。 */
interface ExchangeResponse {
  token: string;
  user: UserInfo;
  redirect_to?: string;
}

/**
 * 原生 fetch 封装（仅用于 auth 领域内 browserRequest 不适用的接口）。
 *
 * 不能走 browserRequest：它在 401 时会 clearAuth 并跳转 /admin/login，
 * 而这里的 401（token 失效 / 一次性 code 无效/过期）是业务结果，跳转动作
 * 应由调用方决定（F4 会改造 browser.ts 的跳转行为，此处先保持调用方控制权）。
 * 解析规则与 browser.ts 保持一致（支持 {code, data} 信封与裸数据）。
 */
async function requestJson<T>(endpoint: string, init: RequestInit): Promise<T> {
  const response = await fetch(endpoint, init);
  const payload = (await response.json().catch(() => ({ message: response.statusText }))) as ApiEnvelope<T>;
  if (!response.ok) throw new ApiError(response.status, getApiMessage(payload, 'Request failed'));
  return unwrapApiPayload(payload);
}

export const authApi = {
  /**
   * 密码登录（终端 login -u 用）。
   *
   * 必须用原生 fetch 而非 browserRequest：凭据错误时后端返回 401 是业务结果
   * （终端要留在掩码模式提示 invalid credentials 可重试），而 browserRequest
   * 在 401 时会 clearAuth 并跳首页，会打断重试流程。解析规则与 browser.ts 一致。
   */
  login: (credentials: { username: string; password: string; remember: boolean }) =>
    requestJson<LoginResponse>(API_ENDPOINTS.ADMIN.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }),
  logout: () => browserRequest<void>(API_ENDPOINTS.ADMIN.LOGOUT, { method: 'POST' }),
  verify: (token: string) => browserRequest<VerifyResponse>(API_ENDPOINTS.ADMIN.VERIFY(), {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    noAuth: true,
  }),
  /**
   * 构建 GitHub OAuth 授权跳转 URL。跳转动作由调用方执行
   * （如终端命令里 `window.location.href = buildGithubAuthorizeUrl(...)`）。
   */
  buildGithubAuthorizeUrl: (redirectTo?: string): string => {
    const base = API_ENDPOINTS.AUTH.GITHUB_AUTHORIZE;
    if (!redirectTo) return base;
    return `${base}?redirect_to=${encodeURIComponent(redirectTo)}`;
  },
  /** 一次性 code 换 JWT（/auth/callback 用）。code 无效/过期时后端返回 401。 */
  exchange: (code: string): Promise<ExchangeResponse> =>
    requestJson<ExchangeResponse>(API_ENDPOINTS.AUTH.EXCHANGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }),
  /**
   * 拉取当前会话用户。
   *
   * 必须用原生 fetch 而非 browserRequest：browserRequest 在 401 时会清 token
   * 并跳转 /admin/login（该行为由 F4 任务改造），而 me() 的 401 只是"会话失效"，
   * 应返回 null 交给调用方（useSession）静默处理。
   * 无 token 直接返回 null；401 → 返回 null；其他错误抛出 ApiError。
   */
  me: async (): Promise<UserInfo | null> => {
    if (typeof window === 'undefined') return null;
    const token = window.localStorage.getItem('token');
    if (!token) return null;
    try {
      return await requestJson<UserInfo>(API_ENDPOINTS.AUTH.ME, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
};
