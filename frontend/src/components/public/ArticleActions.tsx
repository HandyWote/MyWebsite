'use client';

import { Button } from '@mui/material';
import { Share } from 'lucide-react';
import { useState } from 'react';

export function ArticleActions({ title, summary }: { title: string; summary?: string }) {
  const [status, setStatus] = useState('');
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, text: summary, url });
    } else {
      await navigator.clipboard.writeText(url);
      setStatus('Link copied');
    }
  };
  return <Button variant="text" startIcon={<Share size={16} />} onClick={share} aria-label="分享文章">{status || 'Share'}</Button>;
}
