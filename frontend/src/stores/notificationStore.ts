// frontend/src/stores/notificationStore.ts
import { create } from 'zustand';

/** Snackbar 级别：与 MUI Alert 的 severity 取值一一对应。 */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

/**
 * Zustand 全局通知 store。
 * 所有组件共享同一个通知状态，确保通知不会被多个实例覆盖。
 */
export interface NotificationState {
  open: boolean;
  message: string;
  severity: NotificationSeverity;
  show: (message: string, severity?: NotificationSeverity) => void;
  hide: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
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
