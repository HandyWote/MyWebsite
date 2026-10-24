// frontend/src/hooks/useNotification.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { NotificationSeverity } from '@/stores/notificationStore';

vi.mock('@/stores/notificationStore', () => {
  const store = {
    open: false,
    message: '',
    severity: 'info' as NotificationSeverity,
    show: vi.fn((msg: string, sev: NotificationSeverity) => {
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

  it('返回扁平动作与 Snackbar 展示状态，不含链式 notify 壳', () => {
    const { result } = renderHook(() => useNotification());

    expect(result.current.open).toBe(false);
    expect(result.current.message).toBe('');
    expect(result.current.severity).toBe('info');
    expect(result.current.show).toBeInstanceOf(Function);
    expect(result.current.hide).toBeInstanceOf(Function);
    expect(result.current.success).toBeInstanceOf(Function);
    expect(result.current.error).toBeInstanceOf(Function);
    expect(result.current.info).toBeInstanceOf(Function);
    expect(result.current.warning).toBeInstanceOf(Function);
    // 旧的链式 notify 壳必须不存在（返回对象上没有 notify 字段）
    expect(result.current).not.toHaveProperty('notify');
  });

  it('success 触发 success 通知', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.success('保存成功');
    });

    expect(useNotificationStore().show).toHaveBeenCalledWith('保存成功', 'success');
  });

  it('error 触发 error 通知', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.error('删除失败');
    });

    expect(useNotificationStore().show).toHaveBeenCalledWith('删除失败', 'error');
  });

  it('info 触发 info 通知', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.info('正在处理...');
    });

    expect(useNotificationStore().show).toHaveBeenCalledWith('正在处理...', 'info');
  });

  it('warning 触发 warning 通知', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.warning('token 即将过期');
    });

    expect(useNotificationStore().show).toHaveBeenCalledWith('token 即将过期', 'warning');
  });

  it('show/hide 透传底层 store 原语', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.show('自定义', 'warning');
    });
    expect(useNotificationStore().show).toHaveBeenCalledWith('自定义', 'warning');

    act(() => {
      result.current.hide();
    });
    expect(useNotificationStore().hide).toHaveBeenCalled();
  });
});
