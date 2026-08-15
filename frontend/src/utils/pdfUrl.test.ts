import { describe, expect, it } from 'vitest';
import { normalizeBrowserPdfUrl } from './pdfUrl';

describe('normalizeBrowserPdfUrl', () => {
  it('keeps approved same-origin resource paths', () => {
    expect(normalizeBrowserPdfUrl('/api/articles/pdf/example.pdf?download=1')).toBe(
      '/api/articles/pdf/example.pdf?download=1',
    );
    expect(normalizeBrowserPdfUrl('/uploads/example.pdf')).toBe('/uploads/example.pdf');
  });

  it('converts legacy backend absolute URLs to same-origin paths', () => {
    expect(normalizeBrowserPdfUrl('https://backend.example/api/articles/pdf/example.pdf')).toBe(
      '/api/articles/pdf/example.pdf',
    );
  });

  it('allows generated blob URLs and rejects unrelated paths', () => {
    expect(normalizeBrowserPdfUrl('blob:http://localhost:3000/id')).toBe(
      'blob:http://localhost:3000/id',
    );
    expect(normalizeBrowserPdfUrl('https://example.com/redirect')).toBeNull();
    expect(normalizeBrowserPdfUrl('javascript:alert(1)')).toBeNull();
  });

  it('allows configured external MinIO hosts and keeps the full URL', () => {
    expect(
      normalizeBrowserPdfUrl('https://minio-api.unself.cn/web/articles/pdfs/guide.pdf'),
    ).toBe('https://minio-api.unself.cn/web/articles/pdfs/guide.pdf');
    expect(
      normalizeBrowserPdfUrl('https://minio-api.unself.cn/web/articles/pdfs/guide.pdf?download=1'),
    ).toBe('https://minio-api.unself.cn/web/articles/pdfs/guide.pdf?download=1');
    expect(
      normalizeBrowserPdfUrl('https://other.example.com/web/articles/pdfs/guide.pdf'),
    ).toBeNull();
  });
});
