// frontend/src/hooks/useNotification.ts
import { useCallback, useMemo } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import type { NotificationSeverity } from '@/stores/notificationStore';

/**
 * useNotification() 的返回形状：Snackbar 展示状态 + 扁平动作。
 *
 * 显式声明（而不是让调用方按 store 形状反推），这样组件里 `const notify = useNotification()`
 * 就是完整类型，不需要再在边界处补一份 slice 声明。
 */
export interface NotificationApi {
  open: boolean;
  message: string;
  severity: NotificationSeverity;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  show: (message: string, severity?: NotificationSeverity) => void;
  hide: () => void;
}

/**
 * 统一的通知 hook（Zustand 全局 backing，全站只有这一套）。
 *
 * 扁平调用，没有链式壳（旧的 notify.notify().success() 已废弃）：
 *   const notify = useNotification();
 *   notify.success('保存成功');
 *   notify.error('删除失败');
 *   notify.info('正在处理...');
 *   notify.warning('token 即将过期');
 *
 * 展示侧（Snackbar）直接用同一份状态：
 *   <NotificationSnackbar open={notify.open} message={notify.message}
 *     severity={notify.severity} onClose={notify.hide} />
 *
 * show(message, severity) / hide() 是底层原语，需要动态 severity 时用它们。
 */
export default function useNotification(): NotificationApi {
  const { open, message, severity, show, hide } = useNotificationStore();

  const success = useCallback((msg: string) => show(msg, 'success'), [show]);
  const error = useCallback((msg: string) => show(msg, 'error'), [show]);
  const info = useCallback((msg: string) => show(msg, 'info'), [show]);
  const warning = useCallback((msg: string) => show(msg, 'warning'), [show]);

  return useMemo(
    () => ({
      // Snackbar 展示状态
      open,
      message,
      severity,
      // 动作
      success,
      error,
      info,
      warning,
      show,
      hide,
    }),
    [open, message, severity, success, error, info, warning, show, hide],
  );
}
