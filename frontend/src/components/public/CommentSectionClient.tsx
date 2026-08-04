'use client';

import CommentSection from '@/components/articles/CommentSection';

export function CommentSectionClient({ articleId }: { articleId: number }) {
  return <CommentSection articleId={articleId} demoMode={false} />;
}
