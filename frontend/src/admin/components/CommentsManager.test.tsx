import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommentsManager from './CommentsManager';

const commentPayload = {
  id: 1,
  author: '评论者',
  email: 'user@example.com',
  content: '这是一条评论',
  status: 'normal',
  ip_address: '127.0.0.1',
  article_title: '测试文章',
  created_at: '2024-01-15T10:30:00Z',
};

// Mock the unified api module
vi.mock('../../config/api', () => ({
  getApiUrl: {
    adminComments: () => '/api/admin/comments',
    adminCommentExport: () => '/api/admin/comments/export',
    deleteComment: (id) => `/api/admin/comments/${id}`,
    adminCommentStatus: (id) => `/api/admin/comments/${id}/status`,
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
  API_ENDPOINTS: {
    PUBLIC: {},
    ADMIN: {
      ADMIN_COMMENTS: '/api/admin/comments',
      DELETE_COMMENT: (id) => `/api/admin/comments/${id}`,
      COMMENT_STATUS: (id) => `/api/admin/comments/${id}/status`,
      COMMENT_EXPORT: () => '/api/admin/comments/export',
    },
  },
  API_CONFIG: { BASE_URL: '', TIMEOUT: 10000 },
  default: {},
}));

// Mock useNotification hook (Zustand-backed)
vi.mock('../../hooks/useNotification', () => {
  const methods = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };
  const notify = () => methods;
  return {
    default: () => ({
      snackbarOpen: false,
      snackbarMessage: '',
      snackbarSeverity: 'success',
      showNotification: vi.fn(),
      hideNotification: vi.fn(),
      notify,
    }),
  };
});

import { api } from '../../config/api';

describe('CommentsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.getItem.mockReturnValue('token');
    // api.get returns auto-unwrapped data (simulating apiClient behavior)
    api.get.mockResolvedValue({
      comments: [commentPayload],
      total: 1,
    });
  });

  it('有评论数据时正常渲染状态标签', async () => {
    render(<CommentsManager />);

    expect(await screen.findByText('评论者')).toBeInTheDocument();
    expect(screen.getByText('正常')).toBeInTheDocument();
  });
});
