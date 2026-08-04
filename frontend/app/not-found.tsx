import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not Found',
  robots: { index: false, follow: false },
};

export default function NotFoundPage() {
  return (
    <main>
      <h1>404: Page not found</h1>
      <p>The requested page or article does not exist.</p>
      <Link href="/">Return home</Link>
    </main>
  );
}
