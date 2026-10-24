// frontend/src/stores/notificationStore.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      open: false,
      message: '',
      severity: 'info',
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useNotificationStore.getState();
      expect(state.open).toBe(false);
      expect(state.message).toBe('');
      expect(state.severity).toBe('info');
    });
  });

  describe('show', () => {
    it('应该显示成功通知', () => {
      useNotificationStore.getState().show('保存成功', 'success');
      const state = useNotificationStore.getState();
      expect(state.open).toBe(true);
      expect(state.message).toBe('保存成功');
      expect(state.severity).toBe('success');
    });

    it('应该显示错误通知', () => {
      useNotificationStore.getState().show('删除失败', 'error');
      const state = useNotificationStore.getState();
      expect(state.open).toBe(true);
      expect(state.message).toBe('删除失败');
      expect(state.severity).toBe('error');
    });

    it('应该显示警告通知', () => {
      useNotificationStore.getState().show('token 即将过期', 'warning');
      const state = useNotificationStore.getState();
      expect(state.open).toBe(true);
      expect(state.message).toBe('token 即将过期');
      expect(state.severity).toBe('warning');
    });

    it('默认 severity 应该为 info', () => {
      useNotificationStore.getState().show('正在处理...');
      const state = useNotificationStore.getState();
      expect(state.severity).toBe('info');
    });

    it('后发的通知应该覆盖前发的', () => {
      useNotificationStore.getState().show('第一条');
      useNotificationStore.getState().show('第二条', 'error');
      const state = useNotificationStore.getState();
      expect(state.message).toBe('第二条');
      expect(state.severity).toBe('error');
    });
  });

  describe('hide', () => {
    it('应该关闭通知', () => {
      useNotificationStore.getState().show('显示通知');
      expect(useNotificationStore.getState().open).toBe(true);

      useNotificationStore.getState().hide();
      expect(useNotificationStore.getState().open).toBe(false);
    });
  });
});
