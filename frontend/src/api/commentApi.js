import { api, API_ENDPOINTS } from '@/config/api';

const { ADMIN_COMMENTS, DELETE_COMMENT, COMMENT_STATUS, COMMENT_EXPORT } =
  API_ENDPOINTS.ADMIN;

/** 评论领域 API：纯函数层，store 只做状态编排 */
export const commentApi = {
  fetchComments: ({ page, perPage, searchTerm = '', statusFilter = '' } = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    if (searchTerm) params.append('search', searchTerm);
    if (statusFilter) params.append('status', statusFilter);
    return api.get(`${ADMIN_COMMENTS}?${params}`);
  },

  deleteComment: (id) => api.del(DELETE_COMMENT(id)),

  updateCommentStatus: (commentId, status) =>
    api.put(COMMENT_STATUS(commentId), { status }),

  exportComments: ({ searchTerm = '', statusFilter = '' } = {}) => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (statusFilter) params.append('status', statusFilter);
    return api.download(`${COMMENT_EXPORT()}?${params}`);
  },
};
