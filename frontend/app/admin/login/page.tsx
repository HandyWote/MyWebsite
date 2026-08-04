import { Suspense } from 'react';
import Login from '@/admin/components/Login';

export default function LoginPage() {
  return <Suspense fallback={null}><Login /></Suspense>;
}
