// frontend/src/hooks/useNotification.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/stores/notificationStore', () => {
  const store = {
    open: false,
    message: '',
    severity: 'info',
    show: vi.fn((msg, sev) => {
      store.open = true;
      store.message = msg;
      store.severity = sev;
    }),
    hide: vi.fn(() => {
      store.open = false;
    }),
  };

  return {
    useNotificationStore: () => store,
  };
});

import useNotification from './useNotification';
import { useNotificationStore } from '@/stores/notificationStore';

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state via mock
    const store = useNotificationStore();
    store.open = false;
    store.message = '';
    store.severity = 'info';
  });

  it('应该返回兼容旧 API', () => {
    const { result } = renderHook(() => useNotification());

    expect(result.current.snackbarOpen).toBeDefined();
    expect(result.current.snackbarMessage).toBeDefined();
    expect(result.current.snackbarSeverity).toBeDefined();
    expect(result.current.showNotification).toBeDefined();
    expect(result.current.hideNotification).toBeDefined();
  });

  it('应该返回链式 notify API', () => {
    const { result } = renderHook(() => useNotification());

    expect(result.current.notify).toBeDefined();
    expect(result.current.notify).toBeInstanceOf(Function);
    expect(result.current.notify().success).toBeDefined();
    expect(result.current.notify().error).toBeDefined();
    expect(result.current.notify().info).toBeDefined();
    expect(result.current.notify().warning).toBeDefined();
  });

  it('notify.success 应该触发 success 通知', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.notify().success('保存成功');
    });

    expect(useNotificationStore().show).toHaveBeenCalledWith('保存成功', 'success');
  });

  it('notify.error 应该触发 error 通知', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.notify().error('删除失败');
    });

    expect(useNotificationStore().show).toHaveBeenCalledWith('删除失败', 'error');
  });

  it('notify.info 应该触发 info 通知', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.notify().info('正在处理...');
    });

    expect(useNotificationStore().show).toHaveBeenCalledWith('正在处理...', 'info');
  });

  it('notify.warning 应该触发 warning 通知', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.notify().warning('token 即将过期');
    });

    expect(useNotificationStore().show).toHaveBeenCalledWith('token 即将过期', 'warning');
  });

  it('showNotification 兼容旧 API', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.showNotification('操作成功', 'success');
    });

    expect(useNotificationStore().show).toHaveBeenCalledWith('操作成功', 'success');
  });
});
