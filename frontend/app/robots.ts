import type { MetadataRoute } from 'next';
import { absoluteSiteUrl } from '@/seo/site';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/internal', '/api'],
    },
    sitemap: absoluteSiteUrl('/sitemap.xml'),
    host: absoluteSiteUrl('/'),
  };
}
