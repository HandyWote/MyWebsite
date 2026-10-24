// frontend/src/stores/avatarStore.ts
import { create } from 'zustand';
import { avatarApi } from '@/api/avatarApi';
import { withLoading } from '@/api/withLoading';
import type { Avatar } from '@/api/types';

export interface AvatarState {
  /** 头像列表：url 由 store 依据 filename 生成（后端只存文件名）。 */
  avatars: Avatar[];
  loading: boolean;
  error: string | null;

  fetchAvatars: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  /** 返回删除接口的响应（avatarsManager 只取提示文案，缺省时用固定文案）。 */
  deleteAvatar: (avatarId: number) => Promise<Avatar>;
}

const useAvatarStore = create<AvatarState>()((set, get) => ({
  avatars: [],
  loading: false,
  error: null,

  fetchAvatars: async () =>
    withLoading(set, 'loading', 'error', async () => {
      const data = await avatarApi.fetchAll();
      const arr = (data || []).map((avatar) => {
        const url = avatar.filename ? avatarApi.publicUrl(avatar.filename) : undefined;
        return { ...avatar, url };
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
}));

export default useAvatarStore;
