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

describe('AvatarsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('uses avatar.is_current instead of list index to mark current avatar', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: [
          { id: 1, filename: 'newer.webp', is_current: false, uploaded_at: '2026-03-23T10:00:00Z' },
          { id: 2, filename: 'older.webp', is_current: true, uploaded_at: '2026-03-22T10:00:00Z' },
        ],
      }),
    });

    render(<AvatarsManager />);

    await waitFor(() => {
      expect(screen.getByText('头像 1')).toBeInTheDocument();
      expect(screen.getAllByText('当前头像').length).toBeGreaterThan(0);
    });
  });
});
