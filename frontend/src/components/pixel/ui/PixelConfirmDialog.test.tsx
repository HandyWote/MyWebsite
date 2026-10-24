// frontend/src/components/pixel/ui/PixelConfirmDialog.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PixelProvider } from '../PixelProvider';
import { PixelConfirmDialog } from './PixelDialog';

const renderConfirm = (ui: ReactNode) => render(<PixelProvider>{ui}</PixelProvider>);

const baseProps = {
  open: true,
  title: '确认删除',
  message: '确定要删除这条评论吗？此操作不可撤销。',
};

describe('PixelConfirmDialog', () => {
  it('renders nothing while closed', () => {
    renderConfirm(
      <PixelConfirmDialog {...baseProps} open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('确认删除')).not.toBeInTheDocument();
  });

  it('renders title, message and the default confirm/cancel labels', () => {
    renderConfirm(<PixelConfirmDialog {...baseProps} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('确认删除')).toBeInTheDocument();
    expect(screen.getByText(baseProps.message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('uses caller supplied confirmText / cancelText', () => {
    renderConfirm(
      <PixelConfirmDialog
        {...baseProps}
        confirmText="确认删除"
        cancelText="返回"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '确认删除' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument();
  });

  it('calls onConfirm then the close notification, and not onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onClose = vi.fn();
    renderConfirm(
      <PixelConfirmDialog
        {...baseProps}
        confirmText="确认删除"
        onConfirm={onConfirm}
        onCancel={onCancel}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '确认删除' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel and not onConfirm on cancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderConfirm(
      <PixelConfirmDialog {...baseProps} onConfirm={onConfirm} onCancel={onCancel} />
    );

    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('treats Escape as cancel', () => {
    const onCancel = vi.fn();
    renderConfirm(
      <PixelConfirmDialog {...baseProps} onConfirm={vi.fn()} onCancel={onCancel} />
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('tints confirm button and title red for severity="error"', () => {
    renderConfirm(
      <PixelConfirmDialog
        {...baseProps}
        severity="error"
        confirmText="确认删除"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '确认删除' })).toHaveStyle({
      backgroundColor: 'rgb(248, 81, 73)',
    });
    expect(screen.getByText('确认删除', { selector: 'span' })).toHaveStyle({
      color: 'rgb(248, 81, 73)',
    });
  });

  it('keeps the title inside the h2 dialog title (no nested heading, hydration safe)', () => {
    renderConfirm(<PixelConfirmDialog {...baseProps} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('确认删除');
    expect(screen.queryByRole('heading', { level: 6 })).not.toBeInTheDocument();
  });

  it('keeps the square, solid-bordered terminal frame', () => {
    renderConfirm(<PixelConfirmDialog {...baseProps} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('dialog')).toHaveStyle({
      borderRadius: '0',
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: 'rgb(48, 54, 61)',
    });
  });

  it('renders custom children (forms/previews) above the actions', () => {
    renderConfirm(
      <PixelConfirmDialog
        {...baseProps}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        <input aria-label="备注" />
      </PixelConfirmDialog>
    );

    expect(screen.getByLabelText('备注')).toBeInTheDocument();
  });

  it('forwards confirmButtonProps / cancelButtonProps to the pixel buttons', () => {
    renderConfirm(
      <PixelConfirmDialog
        {...baseProps}
        confirmButtonProps={{ 'data-testid': 'confirm-ok' }}
        cancelButtonProps={{ 'data-testid': 'confirm-cancel' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('confirm-ok')).toHaveTextContent('确认');
    expect(screen.getByTestId('confirm-cancel')).toHaveTextContent('取消');
  });
});
