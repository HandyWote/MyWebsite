'use client';

import { Alert, Box, CircularProgress } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { clearAuth, saveRedirectPath, verifyToken } from '@/admin/utils/auth';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<{ loading: boolean; valid: boolean; error: string }>({ loading: true, valid: false, error: '' });

  useEffect(() => {
    let active = true;
    void verifyToken().then((result) => {
      if (!active) return;
      if (result.valid) {
        setState({ loading: false, valid: true, error: '' });
        return;
      }
      clearAuth();
      saveRedirectPath(pathname);
      setState({ loading: false, valid: false, error: result.error || '登录已过期，请重新登录' });
      router.replace(`/admin/login?message=${encodeURIComponent(result.error || '登录已过期，请重新登录')}`);
    });
    return () => { active = false; };
  }, [pathname, router]);

  if (state.loading) {
    return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Box sx={{ textAlign: 'center' }}><CircularProgress /><Box sx={{ mt: 2 }}>验证登录状态...</Box></Box></Box>;
  }
  if (!state.valid) {
    return <Alert severity="warning">{state.error}</Alert>;
  }
  return children;
}
