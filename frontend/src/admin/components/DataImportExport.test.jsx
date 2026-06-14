import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DataImportExport from './DataImportExport';

vi.mock('../../config/api', () => ({
  getApiUrl: {
    adminExport: () => '/api/admin/export',
    adminImport: () => '/api/admin/import',
  },
  api: {
    get: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    post: vi.fn(),
    upload: vi.fn(),
  },
  apiClient: vi.fn(),
  uploadFile: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(status, message) { super(message); this.status = status; this.name = 'ApiError'; }
  },
  buildApiUrl: (ep) => ep,
  unwrapApiPayload: (r) => r?.data ?? r,
  getApiMessage: (r, fb) => r?.msg || r?.message || fb,
  API_ENDPOINTS: { PUBLIC: {}, ADMIN: {} },
  API_CONFIG: { BASE_URL: '', TIMEOUT: 10000 },
  default: {},
}));

// Mock useNotification hook (Zustand-backed)
vi.mock('../../hooks/useNotification', () => ({
  default: () => ({
    notify: () => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }),
  }),
}));

import { api } from '../../config/api';

describe('DataImportExport confirm dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('shows confirmation dialog before importing data', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue(null);

    render(<DataImportExport />);

    // Find the hidden file input and trigger a file selection
    const fileInput = document.getElementById('import-input');
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
    api.post.mockResolvedValue(null);

    render(<DataImportExport />);

    const fileInput = document.getElementById('import-input');
    const file = new File(['{"test": true}'], 'backup.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for dialog to appear
    await screen.findByRole('button', { name: /确认导入/ });

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /确认导入/ }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/import', expect.any(Object));
    }, { timeout: 5000 });
  });

  it('does not import when user cancels confirmation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue(null);

    render(<DataImportExport />);

    const fileInput = document.getElementById('import-input');
    const file = new File(['{"test": true}'], 'backup.json', { type: 'application/json' });

    await user.upload(fileInput, file);

    // Cancel
    await user.click(screen.getByRole('button', { name: /取消/i }));

    expect(api.post).not.toHaveBeenCalled();
  });
});
