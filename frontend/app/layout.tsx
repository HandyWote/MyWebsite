import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import 'katex/dist/katex.min.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '@/index.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/components/AppProviders';
import { absoluteSiteUrl, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/seo/site';

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'zh_CN',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: absoluteSiteUrl('/avatar.webp'), alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [absoluteSiteUrl('/avatar.webp')],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <AppProviders>
          <div id="app-root">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
