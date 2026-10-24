// frontend/src/hooks/useNotification.js
import { useCallback } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';

/**
 * 统一的 Snackbar 通知管理 hook（Zustand 全局 backing）。
 * 使用链式 API：
 *   notify.success('保存成功')
 *   notify.error('删除失败')
 *   notify.info('正在处理...')
 *   notify.warning('token 即将过期')
 */
export default function useNotification() {
  const { open, message, severity, show, hide } = useNotificationStore();

  const showNotification = useCallback((msg, sev = 'info') => {
    show(msg, sev);
  }, [show]);

  const hideNotification = useCallback(() => {
    hide();
  }, [hide]);

  const notify = useCallback(() => {
    // 返回链式 API 对象
    // 这里用一个 proxy 模式，但实际上每个方法直接触发
    return {
      success: (msg) => show(msg, 'success'),
      error: (msg) => show(msg, 'error'),
      info: (msg) => show(msg, 'info'),
      warning: (msg) => show(msg, 'warning'),
    };
  }, [show]);

  return {
    // 兼容旧 API
    snackbarOpen: open,
    snackbarMessage: message,
    snackbarSeverity: severity,
    showNotification,
    hideNotification,
    // 新链式 API
    notify,
  };
}
