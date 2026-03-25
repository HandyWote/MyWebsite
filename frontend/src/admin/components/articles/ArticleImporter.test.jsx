// frontend/src/admin/components/articles/ArticleImporter.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArticleImporter from './ArticleImporter';

describe('ArticleImporter', () => {
  const defaultProps = {
    open: false,
    onImport: vi.fn().mockResolvedValue({ success: 2, failed: 0 }),
    onClose: vi.fn(),
  };

  it('open=false 时不应该显示对话框', () => {
    render(<ArticleImporter {...defaultProps} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open=true 时应该显示对话框', () => {
    render(<ArticleImporter {...defaultProps} open={true} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/批量导入/)).toBeInTheDocument();
  });

  it('关闭按钮应该调用 onClose', () => {
    render(<ArticleImporter {...defaultProps} open={true} />);

    const closeButton = screen.getByText('关闭');
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('导入时应该调用 onImport', async () => {
    render(<ArticleImporter {...defaultProps} open={true} />);

    // 模拟选择文件
    const file = new File(['content'], 'test.md', { type: 'text/markdown' });
    const input = screen.getByLabelText(/选择文件/);
    fireEvent.change(input, { target: { files: [file] } });

    // 点击导入
    const importButton = screen.getByText('导入');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(defaultProps.onImport).toHaveBeenCalled();
    });
  });

  it('文件选择器应该支持 PDF', () => {
    render(<ArticleImporter {...defaultProps} open={true} />);
    const input = screen.getByLabelText(/选择文件/);
    expect(input).toHaveAttribute('accept', expect.stringContaining('.pdf'));
  });
});
