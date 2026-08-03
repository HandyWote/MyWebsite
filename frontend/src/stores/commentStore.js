// frontend/src/stores/commentStore.js
import { create } from 'zustand';
import { commentApi } from '@/api/commentApi';

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
      const data = await commentApi.fetchComments({ page, perPage, searchTerm, statusFilter });

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
    await commentApi.deleteComment(id);
    await get().fetchComments();
  },

  updateCommentStatus: async (commentId, status) => {
    await commentApi.updateCommentStatus(commentId, status);
    await get().fetchComments();
  },

  exportComments: async () => {
    const { searchTerm, statusFilter } = get();
    const blob = await commentApi.exportComments({ searchTerm, statusFilter });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  setPage: (page) => set({ page }),
  setSearchTerm: (searchTerm) => set({ searchTerm, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
}));

export default useCommentStore;
