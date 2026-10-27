import 'server-only';

import { ApiError, parseApiPayload, type ApiEnvelope } from './response';

export class ServerApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ServerApiError';
  }
}

export function getBackendInternalUrl(): string {
  return (process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:5000').replace(/\/$/, '');
}

export type ServerRequestInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export async function serverRequest<T>(endpoint: string, init: ServerRequestInit = {}): Promise<T> {
  if (!endpoint.startsWith('/api/')) {
    throw new Error(`Server API endpoint must start with /api/: ${endpoint}`);
  }
  const response = await fetch(`${getBackendInternalUrl()}${endpoint}`, {
    ...init,
    cache: init.cache ?? 'force-cache',
    headers: {
      Accept: 'application/json',
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => ({ message: response.statusText }))) as ApiEnvelope<T>;
  try {
    return parseApiPayload<T>(payload, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      fallbackMessage: 'Backend request failed',
    });
  } catch (error) {
    // RSC 侧对外只暴露 ServerApiError（页面按 status 区分 404 等），
    // 共享解析的 ApiError 在此转换，不泄漏到服务端组件。
    if (error instanceof ApiError) {
      throw new ServerApiError(error.status, error.message);
    }
    throw error;
  }
}
