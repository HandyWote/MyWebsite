import { useState, useCallback } from 'react';

/**
 * 统一的 Snackbar 通知管理 hook。
 * 替代各管理器组件中重复的 snackbarOpen/snackbarMessage 状态模式。
 *
 * @returns {{ snackbarOpen, snackbarMessage, snackbarSeverity, showNotification, hideNotification }}
 */
export default function useNotification() {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const showNotification = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const hideNotification = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  return {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showNotification,
    hideNotification,
  };
}
