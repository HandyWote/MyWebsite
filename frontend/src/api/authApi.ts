import { API_ENDPOINTS } from './endpoints';
import { browserRequest } from './browser';

interface LoginResponse {
  token: string;
}

interface VerifyResponse {
  valid: boolean;
}

export const authApi = {
  login: (credentials: { username: string; password: string; remember: boolean }) =>
    browserRequest<LoginResponse>(API_ENDPOINTS.ADMIN.LOGIN, {
      method: 'POST',
      body: credentials as unknown as BodyInit,
      credentials: 'include',
      noAuth: true,
    }),
  logout: () => browserRequest<void>(API_ENDPOINTS.ADMIN.LOGOUT, { method: 'POST' }),
  verify: (token: string) => browserRequest<VerifyResponse>(API_ENDPOINTS.ADMIN.VERIFY(), {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    noAuth: true,
  }),
};
