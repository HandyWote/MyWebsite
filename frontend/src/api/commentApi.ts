import { browserApi } from './browser';
import { API_ENDPOINTS } from './endpoints';
import type { CommentPage } from './types';

/** 评论列表查询参数：page/perPage 必填（分页由 store 持有），筛选可空。 */
export interface CommentListParams {
  page: number;
  perPage: number;
  searchTerm?: string;
  statusFilter?: string;
}

/** 评论领域 API：纯函数层，store 只做状态编排 */
export const commentApi = {
  fetchComments: ({
    page,
    perPage,
    searchTerm = '',
    statusFilter = '',
  }: CommentListParams): Promise<CommentPage> => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (searchTerm) params.append('search', searchTerm);
    if (statusFilter) params.append('status', statusFilter);
    return browserApi.get<CommentPage>(`${API_ENDPOINTS.ADMIN.ADMIN_COMMENTS}?${params}`);
  },

  deleteComment: (id: number | string): Promise<void> =>
    browserApi.del<void>(API_ENDPOINTS.ADMIN.DELETE_COMMENT(id)),

  updateCommentStatus: (commentId: number | string, status: string): Promise<void> =>
    browserApi.put<void>(API_ENDPOINTS.ADMIN.COMMENT_STATUS(commentId), { status }),

  exportComments: ({
    searchTerm = '',
    statusFilter = '',
  }: Omit<CommentListParams, 'page' | 'perPage'> = {}): Promise<Blob> => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (statusFilter) params.append('status', statusFilter);
    return browserApi.download(`${API_ENDPOINTS.ADMIN.COMMENT_EXPORT()}?${params}`);
  },
};
