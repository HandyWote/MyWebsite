import { browserApi } from './browser';
import { API_ENDPOINTS } from './endpoints';
import type { Avatar } from './types';

export const avatarApi = {
  fetchAll: () => browserApi.get<Avatar[]>(API_ENDPOINTS.ADMIN.AVATARS),
  upload: (file: File) => browserApi.upload<Avatar>(API_ENDPOINTS.ADMIN.AVATARS, file),
  remove: (id: number) => browserApi.del<Avatar>(API_ENDPOINTS.ADMIN.AVATAR_DELETE(id)),
  setCurrent: (id: number) => browserApi.put<void>(API_ENDPOINTS.ADMIN.AVATAR_SET_CURRENT(id)),
  publicUrl: (filename: string) => API_ENDPOINTS.PUBLIC.AVATAR_FILE(filename),
};
