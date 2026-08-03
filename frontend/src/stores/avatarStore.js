// frontend/src/stores/avatarStore.js
import { create } from 'zustand';
import { api, API_ENDPOINTS, getApiUrl } from '@/config/api';
import { withLoading } from '@/api/withLoading';

const {
  AVATARS,
  AVATAR_DELETE,
  AVATAR_SET_CURRENT,
} = API_ENDPOINTS.ADMIN;

const useAvatarStore = create((set, get) => ({
  avatars: [],
  loading: false,
  error: null,

  fetchAvatars: async () =>
    withLoading(set, 'loading', 'error', async () => {
      const data = await api.get(API_ENDPOINTS.ADMIN.AVATARS);
      const arr = (data || []).map(a => {
        const url = a.filename ? getApiUrl.avatarFile(a.filename) : undefined;
        return { ...a, url };
      });
      set({ avatars: arr });
    }),

  uploadAvatar: async (file) => {
    await api.upload(API_ENDPOINTS.ADMIN.AVATARS, file);
    await get().fetchAvatars();
  },

  deleteAvatar: async (avatarId) => {
    const data = await api.del(API_ENDPOINTS.ADMIN.AVATAR_DELETE(avatarId));
    await get().fetchAvatars();
    return data;
  },

  setCurrent: async (avatarId) => {
    await api.put(API_ENDPOINTS.ADMIN.AVATAR_SET_CURRENT(avatarId));
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
