'use client';

import { RefreshCcw } from 'lucide-react';

export default function GlobalErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <meta name="robots" content="noindex, nofollow" />
        <main>
          <h1>Unable to load the site</h1>
          <p>The request could not be completed.</p>
          <button type="button" onClick={reset} aria-label="Retry loading the site">
            <RefreshCcw aria-hidden="true" size={16} /> Retry
          </button>
        </main>
      </body>
    </html>
  );
}
