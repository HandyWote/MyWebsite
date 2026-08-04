import { clearAuth } from '@/utils/auth';

export type ApiEnvelope<T> = {
  code?: number;
  data?: T;
  message?: string;
  msg?: string;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function buildBrowserApiUrl(endpoint: string): string {
  if (!endpoint.startsWith('/api/') && endpoint !== '/api' && !endpoint.startsWith('/uploads/')) {
    throw new Error(`Browser API endpoint must be relative: ${endpoint}`);
  }
  return endpoint;
}

export function unwrapApiPayload<T>(response: ApiEnvelope<T> | T): T {
  if (response && typeof response === 'object' && !Array.isArray(response) && 'data' in response) {
    return (response as ApiEnvelope<T>).data as T;
  }
  return response as T;
}

export function getApiMessage(response: unknown, fallback = ''): string {
  if (!response || typeof response !== 'object') return fallback;
  const payload = response as ApiEnvelope<unknown>;
  return payload.msg ?? payload.message ?? fallback;
}

function authHeaders(noAuth: boolean): HeadersInit {
  if (noAuth || typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({ message: response.statusText }))) as ApiEnvelope<T>;

  if (response.status === 401 && typeof window !== 'undefined') {
    clearAuth();
    window.location.href = '/admin/login';
  }
  if (!response.ok || (typeof payload.code === 'number' && payload.code !== 0)) {
    throw new ApiError(response.status, getApiMessage(payload, 'Request failed'));
  }
  return unwrapApiPayload(payload);
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
    window.location.href = '/admin/login';
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
