const PARSE_ORIGIN = 'http://browser.local';

export function normalizeBrowserPdfUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('blob:')) return value;

  try {
    const parsed = new URL(value, PARSE_ORIGIN);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.pathname.startsWith('/api/') && !parsed.pathname.startsWith('/uploads/')) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
