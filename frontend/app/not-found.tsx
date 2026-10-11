import type { Metadata } from 'next';
import { TerminalNotFound } from '@/components/public/TerminalNotFound';

export const metadata: Metadata = {
	title: '404 not found',
	robots: { index: false, follow: false },
};

export default function NotFoundPage() {
	return <TerminalNotFound />;
}
