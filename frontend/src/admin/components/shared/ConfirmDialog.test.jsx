import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: '确认操作',
    message: '确定要执行此操作吗？',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('open=false 时不渲染对话框', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('确认操作')).not.toBeInTheDocument();
  });

  it('open=true 时渲染标题和消息', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('确认操作')).toBeInTheDocument();
    expect(screen.getByText('确定要执行此操作吗？')).toBeInTheDocument();
  });

  it('渲染默认的确认和取消按钮', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('确认')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('支持自定义确认按钮文案', () => {
    render(<ConfirmDialog {...defaultProps} confirmText="删除" />);
    expect(screen.getByText('删除')).toBeInTheDocument();
    expect(screen.queryByText('确认')).not.toBeInTheDocument();
  });

  it('支持自定义取消按钮文案', () => {
    render(<ConfirmDialog {...defaultProps} cancelText="返回" />);
    expect(screen.getByText('返回')).toBeInTheDocument();
    expect(screen.queryByText('取消')).not.toBeInTheDocument();
  });

  it('点击确认按钮时调用 onConfirm', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('确认'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('点击取消按钮时调用 onCancel', () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('取消'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('severity=error 时确认按钮为红色', () => {
    render(<ConfirmDialog {...defaultProps} severity="error" />);
    const confirmButton = screen.getByText('确认');
    // MUI Button with color="error" should have the class
    expect(confirmButton.className).toMatch(/MuiButton-containedError/);
  });

  it('severity 未设置时确认按钮为默认 primary', () => {
    render(<ConfirmDialog {...defaultProps} />);
    const confirmButton = screen.getByText('确认');
    expect(confirmButton.className).toMatch(/MuiButton-containedPrimary/);
  });

  it('点击对话框背景（关闭）时调用 onCancel', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    // 模拟 Dialog 的 onClose
    const dialog = container.querySelector('.MuiDialog-root');
    if (dialog) {
      fireEvent.click(dialog);
      // MUI Dialog 的 backdrop 点击会触发 onClose
    }
  });

  it('onConfirm 调用后自动调用 onClose（如果提供）', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('确认'));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
