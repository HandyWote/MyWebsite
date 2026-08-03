// frontend/src/stores/avatarStore.js
import { create } from 'zustand';
import { api, API_ENDPOINTS, getApiUrl } from '@/config/api';

const {
  AVATARS,
  AVATAR_DELETE,
  AVATAR_SET_CURRENT,
} = API_ENDPOINTS.ADMIN;

const useAvatarStore = create((set, get) => ({
  avatars: [],
  loading: false,
  error: null,

  fetchAvatars: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(API_ENDPOINTS.ADMIN.AVATARS);
      const arr = (data || []).map(a => {
        const url = a.filename ? getApiUrl.avatarFile(a.filename) : undefined;
        return { ...a, url };
      });
      set({ avatars: arr, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  uploadAvatar: async (file) => {
    try {
      await api.upload(API_ENDPOINTS.ADMIN.AVATARS, file);
      await get().fetchAvatars();
    } catch (err) {
      throw err;
    }
  },

  deleteAvatar: async (avatarId) => {
    try {
      const data = await api.del(API_ENDPOINTS.ADMIN.AVATAR_DELETE(avatarId));
      await get().fetchAvatars();
      return data;
    } catch (err) {
      throw err;
    }
  },

  setCurrent: async (avatarId) => {
    try {
      await api.put(API_ENDPOINTS.ADMIN.AVATAR_SET_CURRENT(avatarId));
      await get().fetchAvatars();
    } catch (err) {
      throw err;
    }
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
