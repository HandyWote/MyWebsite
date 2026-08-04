import type { ReactNode } from 'react';
import { PublicExperience } from '@/components/public/PublicExperience';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicExperience>{children}</PublicExperience>;
}
