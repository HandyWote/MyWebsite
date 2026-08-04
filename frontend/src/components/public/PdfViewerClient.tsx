'use client';

import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('@/components/PdfViewerOnCanvas'), { ssr: false });

export function PdfViewerClient({ filename, url }: { filename: string; url: string }) {
  return <PdfViewer filename={filename} url={url} />;
}
