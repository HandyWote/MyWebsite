import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExportDataSet } from '@/api/types';
import DataImportExport from './DataImportExport';

// 备份 API 未落成真类型前先用显式签名的 spy，行为断言仍按原样保留。
const exportApiMocks = vi.hoisted(() => ({
  exportData: vi.fn<() => Promise<ExportDataSet>>(),
  importData: vi.fn<(payload: ExportDataSet) => Promise<void>>(),
}));

vi.mock('../../api/exportApi', () => ({
  exportApi: exportApiMocks,
}));
vi.mock('../../hooks/useNotification', () => ({
  default: () => ({
    open: false,
    message: '',
    severity: 'info',
    success: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
    info: vi.fn<(message: string) => void>(),
    warning: vi.fn<(message: string) => void>(),
    show: vi.fn<(message: string, severity: string) => void>(),
    hide: vi.fn<() => void>(),
  }),
}));

/** 组件里隐藏的导入文件输入框。 */
const getFileInput = (): HTMLInputElement => {
  const element = document.getElementById('import-input');
  if (!(element instanceof HTMLInputElement)) throw new Error('import-input 未渲染');
  return element;
};

describe('DataImportExport confirm dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('shows confirmation dialog before importing data', async () => {
    const user = userEvent.setup();
    exportApiMocks.importData.mockResolvedValue(undefined);

    render(<DataImportExport />);

    // Find the hidden file input and trigger a file selection
    const fileInput = getFileInput();
    const file = new File(['{"test": true}'], 'backup.json', { type: 'application/json' });

    await user.upload(fileInput, file);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/覆盖现有数据/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /确认导入/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取消/ })).toBeInTheDocument();
  });

  it('proceeds with import after user confirms', async () => {
    exportApiMocks.importData.mockResolvedValue(undefined);

    render(<DataImportExport />);

    const fileInput = getFileInput();
    const file = new File(['{"test": true}'], 'backup.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for dialog to appear
    await screen.findByRole('button', { name: /确认导入/ });

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /确认导入/ }));

    await waitFor(() => {
      expect(exportApiMocks.importData).toHaveBeenCalledWith(expect.any(Object));
    }, { timeout: 5000 });
  });

  it('does not import when user cancels confirmation', async () => {
    const user = userEvent.setup();
    exportApiMocks.importData.mockResolvedValue(undefined);

    render(<DataImportExport />);

    const fileInput = getFileInput();
    const file = new File(['{"test": true}'], 'backup.json', { type: 'application/json' });

    await user.upload(fileInput, file);

    // Cancel
    await user.click(screen.getByRole('button', { name: /取消/i }));

    expect(exportApiMocks.importData).not.toHaveBeenCalled();
  });
});
