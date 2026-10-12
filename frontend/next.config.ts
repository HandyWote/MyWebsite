import type { NextConfig } from 'next';
import type { Redirect } from 'next/dist/lib/load-custom-routes';

const backendUrl = (process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:5000').replace(/\/$/, '');

// 独立导出以便单测直接调用（appShell.test.js 断言重定向契约），行为与 nextConfig.redirects 完全一致
const redirects = async (): Promise<Redirect[]> => {
  return [
    { source: '/app', destination: '/', permanent: true },
    { source: '/app/articles', destination: '/articles', permanent: true },
    { source: '/app/articles/:id', destination: '/articles/:id', permanent: true },
    { source: '/app/projects', destination: '/projects', permanent: true },
    { source: '/app/admin/:path*', destination: '/admin/:path*', permanent: true },
  ];
};

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  redirects,
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

export { redirects };
export default nextConfig;
