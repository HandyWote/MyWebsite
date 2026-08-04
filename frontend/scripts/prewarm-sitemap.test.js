import { describe, expect, it, vi } from 'vitest';
import { parseSitemapLocations, prewarmSitemap } from './prewarm-sitemap.mjs';

const response = (body = '', ok = true, status = 200) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(body),
});

describe('sitemap prewarm script', () => {
  it('parses XML locations and warms every same-origin URL', async () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://example.com/</loc></url>
      <url><loc>https://example.com/articles/1?x=1&amp;y=2</loc></url>
    </urlset>`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(xml))
      .mockResolvedValue(response());

    await expect(prewarmSitemap('https://example.com/base', { fetchImpl: fetchMock, concurrency: 2 }))
      .resolves.toEqual({ sitemapUrl: 'https://example.com/sitemap.xml', warmed: 2 });
    expect(parseSitemapLocations(xml)).toEqual([
      'https://example.com/',
      'https://example.com/articles/1?x=1&y=2',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fails when sitemap fetch or a warm request fails', async () => {
    await expect(prewarmSitemap('https://example.com', {
      fetchImpl: vi.fn().mockResolvedValue(response('', false, 503)),
    })).rejects.toThrow('Prewarm request failed (503)');

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response('<urlset><url><loc>https://example.com/articles/1</loc></url></urlset>'))
      .mockResolvedValueOnce(response('', false, 500));
    await expect(prewarmSitemap('https://example.com', { fetchImpl: fetchMock }))
      .rejects.toThrow('Prewarm request failed (500)');
  });

  it('rejects cross-origin sitemap entries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(
      '<urlset><url><loc>https://attacker.example/articles/1</loc></url></urlset>',
    ));
    await expect(prewarmSitemap('https://example.com', { fetchImpl: fetchMock }))
      .rejects.toThrow('outside https://example.com');
  });
});
