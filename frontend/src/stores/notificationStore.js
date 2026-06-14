// frontend/src/stores/notificationStore.js
import { create } from 'zustand';

/**
 * Zustand 全局通知 store。
 * 所有组件共享同一个通知状态，确保通知不会被多个实例覆盖。
 */
export const useNotificationStore = create((set) => ({
  open: false,
  message: '',
  severity: 'info',

  show: (message, severity = 'info') => {
    set({ open: true, message, severity });
  },

  hide: () => {
    set({ open: false });
  },
}));
