// frontend/src/components/pixel/ui/PixelButton.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PixelProvider } from '../PixelProvider';
import PixelButton from './PixelButton';

// 组件按真实使用环境渲染：pixel 主题提供 palette（error/warning/success 等取色）。
const renderButton = (ui: ReactNode) => render(<PixelProvider>{ui}</PixelProvider>);

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

describe('PixelButton', () => {
  it('renders its label and forwards clicks', () => {
    const onClick = vi.fn();
    renderButton(<PixelButton onClick={onClick}>sign in</PixelButton>);

    fireEvent.click(screen.getByRole('button', { name: 'sign in' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    renderButton(
      <PixelButton disabled onClick={onClick}>
        提交
      </PixelButton>
    );

    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    expect(screen.getByRole('button', { name: '提交' })).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps the historical medium look by default (8/16 padding, sm font)', () => {
    renderButton(<PixelButton>默认</PixelButton>);
    const button = screen.getByRole('button', { name: '默认' });

    expect(button).toHaveStyle({ padding: '8px 16px', fontSize: '0.875rem' });
  });

  it('renders the small size with tighter padding and xs font', () => {
    renderButton(<PixelButton size="small">小号</PixelButton>);
    const button = screen.getByRole('button', { name: '小号' });

    expect(button).toHaveStyle({ padding: '4px 8px', fontSize: '0.75rem' });
  });

  it('keeps the primary variant filled with the accent blue', () => {
    renderButton(<PixelButton>primary</PixelButton>);

    expect(screen.getByRole('button', { name: 'primary' })).toHaveStyle({
      backgroundColor: 'rgb(88, 166, 255)',
      borderRadius: '0',
    });
  });

  it('tints the filled button red for color="error"', () => {
    renderButton(<PixelButton color="error">删除</PixelButton>);

    expect(screen.getByRole('button', { name: '删除' })).toHaveStyle({
      backgroundColor: 'rgb(248, 81, 73)',
    });
  });

  it('keeps the outline variant transparent with a dashed border, tinted by color', () => {
    renderButton(
      <PixelButton variant="outline" color="error">
        outline
      </PixelButton>
    );
    const button = screen.getByRole('button', { name: 'outline' });

    expect(button).toHaveStyle({
      backgroundColor: TRANSPARENT,
      borderStyle: 'dashed',
      color: 'rgb(248, 81, 73)',
    });
  });

  it('keeps the ghost variant borderless', () => {
    renderButton(<PixelButton variant="ghost">not now</PixelButton>);
    const button = screen.getByRole('button', { name: 'not now' });

    expect(button).toHaveStyle({ backgroundColor: TRANSPARENT, borderStyle: 'none' });
  });

  it('accepts MUI variant aliases so admin markup can migrate without rewriting variants', () => {
    renderButton(
      <>
        <PixelButton variant="contained">contained</PixelButton>
        <PixelButton variant="outlined">outlined</PixelButton>
        <PixelButton variant="text">text</PixelButton>
      </>
    );

    expect(screen.getByRole('button', { name: 'contained' })).toHaveStyle({
      backgroundColor: 'rgb(88, 166, 255)',
    });
    expect(screen.getByRole('button', { name: 'outlined' })).toHaveStyle({
      backgroundColor: TRANSPARENT,
      borderStyle: 'dashed',
    });
    expect(screen.getByRole('button', { name: 'text' })).toHaveStyle({
      borderStyle: 'none',
    });
  });

  it('renders startIcon and endIcon inside the button', () => {
    renderButton(
      <PixelButton
        startIcon={<span data-testid="start-icon">up</span>}
        endIcon={<span data-testid="end-icon">down</span>}
      >
        上传
      </PixelButton>
    );
    const button = screen.getByRole('button', { name: /上传/ });

    expect(button).toContainElement(screen.getByTestId('start-icon'));
    expect(button).toContainElement(screen.getByTestId('end-icon'));
  });

  it('renders as a label for file-upload buttons so the hidden input is reachable', () => {
    const { container } = renderButton(
      <PixelButton component="label" startIcon={<span>up</span>}>
        选择文件
        <input type="file" aria-label="选择文件" hidden />
      </PixelButton>
    );

    const label = container.querySelector('label');
    expect(label).not.toBeNull();
    expect(label).toHaveTextContent('选择文件');
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('forwards data-testid to the rendered root element', () => {
    renderButton(<PixelButton data-testid="btn-submit">提交</PixelButton>);

    expect(screen.getByTestId('btn-submit')).toHaveTextContent('提交');
  });

  it('lets callers override spacing through sx without losing the pixel base', () => {
    renderButton(<PixelButton sx={{ letterSpacing: '2px' }}>sx</PixelButton>);
    const button = screen.getByRole('button', { name: 'sx' });

    expect(button).toHaveStyle({ letterSpacing: '2px', borderRadius: '0' });
  });
});
