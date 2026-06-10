import { getApiUrl } from '../config/api';

/**
 * 将资源路径解析为完整 URL。
 * 处理绝对 URL、根路径相对路径、以及需要拼接 baseUrl 的路径。
 *
 * @param {string} path - 资源路径
 * @returns {string} 完整 URL
 */
export function resolveAssetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window !== 'undefined' && path.startsWith('/')) {
    return `${window.location.origin}${path}`;
  }
  const base = getApiUrl.baseUrl();
  const normalizedBase = base && base.endsWith('/') ? base.slice(0, -1) : base || '';
  if (path.startsWith('/')) {
    return `${normalizedBase}${path}`;
  }
  return normalizedBase ? `${normalizedBase}/${path}` : path;
}
