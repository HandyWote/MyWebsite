import type { NextConfig } from 'next';

const backendUrl = (process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:5000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async redirects() {
    return [
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
