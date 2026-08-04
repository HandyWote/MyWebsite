import { pathToFileURL } from 'node:url';

const DEFAULT_CONCURRENCY = 8;

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

export function parseSitemapLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/giu)]
    .map((match) => decodeXml(match[1].trim()));
}

async function assertOk(response, url) {
  if (!response.ok) {
    throw new Error(`Prewarm request failed (${response.status}) for ${url}`);
  }
}

function parseUrl(value, base) {
  try {
    return base ? new URL(value, base) : new URL(value);
  } catch {
    throw new Error(`Invalid sitemap URL: ${value}`);
  }
}

export async function prewarmSitemap(siteUrl, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const origin = parseUrl(siteUrl).origin;
  const sitemapUrl = parseUrl('/sitemap.xml', origin).toString();
  const sitemapResponse = await fetchImpl(sitemapUrl, { headers: { Accept: 'application/xml' } });
  await assertOk(sitemapResponse, sitemapUrl);
  const locations = parseSitemapLocations(await sitemapResponse.text());
  if (locations.length === 0) throw new Error(`Sitemap contains no URLs: ${sitemapUrl}`);

  const urls = locations.map((location) => parseUrl(location));
  const external = urls.find((url) => url.origin !== origin);
  if (external) throw new Error(`Sitemap URL is outside ${origin}: ${external.toString()}`);

  let nextIndex = 0;
  async function worker() {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex];
      nextIndex += 1;
      const response = await fetchImpl(url, { redirect: 'follow' });
      await assertOk(response, url.toString());
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()));
  return { sitemapUrl, warmed: urls.length };
}

async function main() {
  const siteUrl = process.argv[2] ?? process.env.PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error('PUBLIC_SITE_URL or a site URL argument is required');
  const result = await prewarmSitemap(siteUrl);
  process.stdout.write(`Warmed ${result.warmed} URLs from ${result.sitemapUrl}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
