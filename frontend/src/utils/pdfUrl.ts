const PARSE_ORIGIN = 'http://browser.local';

// 外部 MinIO 域名白名单：这些域名的 PDF 链接直接返回完整 URL（浏览器跨域加载），
// 其余情况（站内 /api、/uploads 或后端绝对地址）统一转同源相对路径。
const EXTERNAL_PDF_HOSTS = ['minio-api.unself.cn'];

export function normalizeBrowserPdfUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('blob:')) return value;

  try {
    const parsed = new URL(value, PARSE_ORIGIN);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    const isExternalPdfHost = EXTERNAL_PDF_HOSTS.includes(parsed.host);
    if (!isExternalPdfHost && !parsed.pathname.startsWith('/api/') && !parsed.pathname.startsWith('/uploads/')) {
      return null;
    }
    // 外部 MinIO 域名返回完整 URL，其余返回同源相对路径
    return isExternalPdfHost
      ? parsed.href
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
