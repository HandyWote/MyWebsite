'use client';

import { useRef, type PointerEvent, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';

export function HomeEnterBoundary({ children }: { children: ReactNode }) {
  const router = useRouter();
  const lastTapAt = useRef(0);
  const isInteractive = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('a, button, input, textarea, select'));
  const enter = (target: EventTarget | null) => {
    if (!isInteractive(target)) router.push('/articles');
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || isInteractive(event.target)) return;
    const now = Date.now();
    if (now - lastTapAt.current < 320) {
      lastTapAt.current = 0;
      router.push('/articles');
    } else {
      lastTapAt.current = now;
    }
  };
  return (
    <Box onDoubleClick={(event: MouseEvent<HTMLDivElement>) => enter(event.target)} onPointerUp={onPointerUp}>
      {children}
    </Box>
  );
}
