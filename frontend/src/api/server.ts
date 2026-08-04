import 'server-only';

import type { ApiEnvelope } from './browser';

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

export async function serverRequest<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  if (!endpoint.startsWith('/api/')) {
    throw new Error(`Server API endpoint must start with /api/: ${endpoint}`);
  }
  const response = await fetch(`${getBackendInternalUrl()}${endpoint}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => ({ message: response.statusText }))) as ApiEnvelope<T>;
  if (!response.ok || (typeof payload.code === 'number' && payload.code !== 0)) {
    throw new ServerApiError(response.status, payload.msg ?? payload.message ?? 'Backend request failed');
  }
  return payload && typeof payload === 'object' && 'data' in payload
    ? payload.data as T
    : payload as T;
}
