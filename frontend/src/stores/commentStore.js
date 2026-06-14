// frontend/src/stores/commentStore.js
import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/config/api';

const {
  ADMIN_COMMENTS,
  DELETE_COMMENT,
  COMMENT_STATUS,
  COMMENT_EXPORT,
} = API_ENDPOINTS.ADMIN;

const PER_PAGE = 10;

const useCommentStore = create((set, get) => ({
  comments: [],
  total: 0,
  page: 1,
  perPage: PER_PAGE,
  searchTerm: '',
  statusFilter: '',
  loading: false,
  error: null,

  fetchComments: async () => {
    const { page, perPage, searchTerm, statusFilter } = get();
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const data = await api.get(`${ADMIN_COMMENTS}?${params}`);

      const comments = (data.comments || []).map(comment => ({
        ...comment,
        status: comment.status || 'normal',
        article_title: comment.article_title || '未知文章',
      }));
      set({ comments, total: data.total || 0, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteComment: async (id) => {
    try {
      await api.del(DELETE_COMMENT(id));
      await get().fetchComments();
    } catch (err) {
      throw err;
    }
  },

  updateCommentStatus: async (commentId, status) => {
    try {
      await api.put(COMMENT_STATUS(commentId), { status });
      await get().fetchComments();
    } catch (err) {
      throw err;
    }
  },

  exportComments: async () => {
    const { searchTerm, statusFilter } = get();
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const blob = await api.download(`${COMMENT_EXPORT()}?${params}`);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comments_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      throw err;
    }
  },

  setPage: (page) => set({ page }),
  setSearchTerm: (searchTerm) => set({ searchTerm, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
}));

export default useCommentStore;
