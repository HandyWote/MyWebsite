'use client';

import type { ReactNode } from 'react';
import AdminLayout from '@/admin/components/AdminLayout';
import RequireAuth from '@/admin/components/RequireAuth';
import ErrorBoundary from '@/admin/components/shared/ErrorBoundary';

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  return <ErrorBoundary><RequireAuth><AdminLayout>{children}</AdminLayout></RequireAuth></ErrorBoundary>;
}
