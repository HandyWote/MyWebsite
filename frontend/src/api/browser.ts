import { clearAuth } from '@/utils/auth';
import { redirectToLogin } from './navigation';
import { ApiError, parseApiPayload, type ApiEnvelope } from './response';

// 现存 import 全部走 `@/api/browser`：符号本体已收归 ./response，此处原样转发。
export {
  ApiError,
  getApiMessage,
  parseApiPayload,
  unwrapApiPayload,
  type ApiEnvelope,
  type ApiPayloadContext,
} from './response';

export function buildBrowserApiUrl(endpoint: string): string {
  if (!endpoint.startsWith('/api/') && endpoint !== '/api' && !endpoint.startsWith('/uploads/')) {
    throw new Error(`Browser API endpoint must be relative: ${endpoint}`);
  }
  return endpoint;
}

function authHeaders(noAuth: boolean): HeadersInit {
  if (noAuth || typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({ message: response.statusText }))) as ApiEnvelope<T>;

  // 浏览器端独有的 401 副作用：清会话 + 跳登录。放在纯解析函数外面，
  // authApi/drawingApi 用原生 fetch 就是为了绕开它（401 在那里是业务结果）。
  if (response.status === 401 && typeof window !== 'undefined') {
    clearAuth();
    redirectToLogin();
  }
  return parseApiPayload<T>(payload, {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  });
}

export async function browserRequest<T>(
  endpoint: string,
  options: RequestInit & { noAuth?: boolean } = {},
): Promise<T> {
  const { noAuth = false, ...requestInit } = options;
  const hasFormData = requestInit.body instanceof FormData;
  const headers = {
    ...authHeaders(noAuth),
    ...(!hasFormData ? { 'Content-Type': 'application/json' } : {}),
    ...requestInit.headers,
  };
  const body = requestInit.body && typeof requestInit.body === 'object' && !hasFormData
    ? JSON.stringify(requestInit.body)
    : requestInit.body;
  const response = await fetch(buildBrowserApiUrl(endpoint), { ...requestInit, headers, body });
  return parseResponse<T>(response);
}

export async function uploadBrowserFile<T>(
  endpoint: string,
  files: File | File[],
  fieldName = 'file',
): Promise<T> {
  const formData = new FormData();
  const values = Array.isArray(files) ? files : [files];
  values.forEach((file) => formData.append(fieldName, file));
  return browserRequest<T>(endpoint, { method: 'POST', body: formData });
}

export async function downloadBrowserBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
  const response = await fetch(buildBrowserApiUrl(endpoint), {
    ...options,
    headers: { ...authHeaders(false), ...options.headers },
  });
  if (response.status === 401 && typeof window !== 'undefined') {
    clearAuth();
    redirectToLogin();
  }
  if (!response.ok) throw new ApiError(response.status, response.statusText);
  return response.blob();
}

export const browserApi = {
  get: <T>(endpoint: string) => browserRequest<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) => browserRequest<T>(endpoint, { method: 'POST', body: data as BodyInit }),
  put: <T>(endpoint: string, data?: unknown) => browserRequest<T>(endpoint, { method: 'PUT', body: data as BodyInit }),
  del: <T>(endpoint: string) => browserRequest<T>(endpoint, { method: 'DELETE' }),
  upload: uploadBrowserFile,
  uploadFiles: <T>(endpoint: string, files: File[], fieldName = 'files') => uploadBrowserFile<T>(endpoint, files, fieldName),
  download: downloadBrowserBlob,
};
