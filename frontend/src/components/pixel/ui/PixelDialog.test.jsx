// frontend/src/components/pixel/ui/PixelDialog.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PixelDialog from './PixelDialog';

describe('PixelDialog', () => {
  it('does not render content when closed', () => {
    render(
      <PixelDialog open={false} title="标题">
        <div>内容区</div>
      </PixelDialog>
    );

    expect(screen.queryByText('标题')).not.toBeInTheDocument();
    expect(screen.queryByText('内容区')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title, children and actions when open', () => {
    render(
      <PixelDialog open title="标题" actions={<button type="button">确定</button>}>
        <div>内容区</div>
      </PixelDialog>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('标题')).toBeInTheDocument();
    expect(screen.getByText('内容区')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确定' })).toBeInTheDocument();
  });

  it('does not render title or actions when not provided', () => {
    render(
      <PixelDialog open>
        <div>仅内容</div>
      </PixelDialog>
    );

    expect(screen.getByText('仅内容')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 6 })).not.toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed on the dialog', () => {
    const onClose = vi.fn();
    render(
      <PixelDialog open onClose={onClose}>
        <div>内容区</div>
      </PixelDialog>
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
