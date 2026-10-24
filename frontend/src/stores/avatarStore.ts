// frontend/src/stores/avatarStore.js
import { create } from 'zustand';
import { avatarApi } from '@/api/avatarApi';
import { withLoading } from '@/api/withLoading';

const useAvatarStore = create((set, get) => ({
  avatars: [],
  loading: false,
  error: null,

  fetchAvatars: async () =>
    withLoading(set, 'loading', 'error', async () => {
      const data = await avatarApi.fetchAll();
      const arr = (data || []).map(a => {
        const url = a.filename ? avatarApi.publicUrl(a.filename) : undefined;
        return { ...a, url };
      });
      set({ avatars: arr });
    }),

  uploadAvatar: async (file) => {
    await avatarApi.upload(file);
    await get().fetchAvatars();
  },

  deleteAvatar: async (avatarId) => {
    const data = await avatarApi.remove(avatarId);
    await get().fetchAvatars();
    return data;
  },

  setCurrent: async (avatarId) => {
    await avatarApi.setCurrent(avatarId);
    await get().fetchAvatars();
  },

  reorderAvatars: async (newOrder) => {
    set({ avatars: newOrder });
    // 设第一个为当前头像
    if (newOrder.length > 0) {
      await get().setCurrent(newOrder[0].id);
    }
  },
}));

export default useAvatarStore;
