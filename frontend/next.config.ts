import type { NextConfig } from 'next';

const backendUrl = (process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:5000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async redirects() {
    return [
      // 域归一：www 一律 301 到裸域，canonical / sitemap 只认 PUBLIC_SITE_URL。
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.handywote.top' }],
        destination: 'https://handywote.top/:path*',
        permanent: true,
      },
      { source: '/app', destination: '/', permanent: true },
      { source: '/app/articles', destination: '/articles', permanent: true },
      { source: '/app/articles/:id', destination: '/articles/:id', permanent: true },
      { source: '/app/projects', destination: '/projects', permanent: true },
      { source: '/app/admin/:path*', destination: '/admin/:path*', permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
