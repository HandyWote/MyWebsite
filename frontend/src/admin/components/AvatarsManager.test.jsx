import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarsManager from './AvatarsManager';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: function PointerSensor() {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => ([])),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (items) => items,
  SortableContext: ({ children }) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

// Mock the unified api module
vi.mock('../../config/api', () => ({
  getApiUrl: {
    adminAvatars: () => '/api/admin/avatars',
    adminAvatarSetCurrent: (id) => `/api/admin/avatars/${id}/set_current`,
    adminAvatarDelete: (id) => `/api/admin/avatars/${id}`,
    avatarFile: (filename) => `/api/avatars/file/${filename}`,
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

import { api } from '../../config/api';

describe('AvatarsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('uses avatar.is_current instead of list index to mark current avatar', async () => {
    api.get.mockResolvedValue([
      { id: 1, filename: 'newer.webp', is_current: false, uploaded_at: '2026-03-23T10:00:00Z' },
      { id: 2, filename: 'older.webp', is_current: true, uploaded_at: '2026-03-22T10:00:00Z' },
    ]);

    render(<AvatarsManager />);

    await waitFor(() => {
      expect(screen.getByText('头像 1')).toBeInTheDocument();
      expect(screen.getAllByText('当前头像').length).toBeGreaterThan(0);
    });
  });
});
