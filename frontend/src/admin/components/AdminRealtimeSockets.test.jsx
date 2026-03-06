import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteContentEditor from './SiteContentEditor';
import SkillsManager from './SkillsManager';
import ContactsManager from './ContactsManager';
import AvatarsManager from './AvatarsManager';

const { ioMock } = vi.hoisted(() => ({
  ioMock: vi.fn(),
}));

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

vi.mock('../../config/api', () => ({
  getApiUrl: {
    websocket: () => 'https://example.com',
    adminSiteBlocks: () => '/api/admin/site_blocks',
    adminSkills: () => '/api/admin/skills',
    adminContacts: () => '/api/admin/contacts',
    adminAvatars: () => '/api/admin/avatars',
    adminAvatarFile: (filename) => `/api/admin/avatars/file/${filename}`,
  },
}));

vi.mock('@mui/material', () => {
  const create = (tag = 'div') => ({ children, ...props }) => {
    const Component = tag;
    return <Component {...props}>{children}</Component>;
  };

  return {
    Box: create(),
    Button: create('button'),
    Typography: create(),
    Container: create(),
    LinearProgress: create(),
    TextField: create('input'),
    Slider: create('input'),
    Paper: create(),
    Stack: create(),
    IconButton: create('button'),
    Dialog: create(),
    DialogTitle: create(),
    DialogContent: create(),
    DialogContentText: create(),
    DialogActions: create(),
    MenuItem: create('option'),
    Avatar: create('img'),
    Snackbar: create(),
    Tooltip: create(),
    CircularProgress: create(),
    Alert: create(),
    Divider: create(),
  };
});

vi.mock('@mui/icons-material/DragIndicator', () => ({ default: () => <span>DragIndicator</span> }));
vi.mock('@mui/icons-material/AddCircleOutline', () => ({ default: () => <span>AddCircleOutline</span> }));
vi.mock('@mui/icons-material/DeleteOutline', () => ({ default: () => <span>DeleteOutline</span> }));
vi.mock('@mui/icons-material/Delete', () => ({ default: () => <span>Delete</span> }));
vi.mock('@mui/icons-material/AddPhotoAlternate', () => ({ default: () => <span>AddPhotoAlternate</span> }));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: function PointerSensor() {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((items) => items),
  SortableContext: ({ children }) => <div>{children}</div>,
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

describe('Admin realtime sockets', () => {
  beforeEach(() => {
    ioMock.mockReset();
    ioMock.mockReturnValue({
      on: vi.fn(),
      disconnect: vi.fn(),
    });

    window.localStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return 'test-token';
      return null;
    });

    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url.includes('/site_blocks')) {
        return {
          ok: true,
          json: async () => ({ code: 0, data: [] }),
        };
      }

      if (url.includes('/skills')) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        };
      }

      if (url.includes('/contacts')) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        };
      }

      return {
        ok: true,
        json: async () => ({ data: [], avatars: [] }),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses websocket and polling transports for admin realtime sockets', async () => {
    render(<SiteContentEditor />);
    render(<SkillsManager />);
    render(<ContactsManager />);
    render(<AvatarsManager />);

    await waitFor(() => {
      expect(ioMock).toHaveBeenCalledTimes(4);
    });

    expect(ioMock).toHaveBeenNthCalledWith(
      1,
      'https://example.com/site_blocks',
      expect.objectContaining({ transports: ['websocket', 'polling'] }),
    );
    expect(ioMock).toHaveBeenNthCalledWith(
      2,
      'https://example.com/skills',
      expect.objectContaining({ transports: ['websocket', 'polling'] }),
    );
    expect(ioMock).toHaveBeenNthCalledWith(
      3,
      'https://example.com/contacts',
      expect.objectContaining({ transports: ['websocket', 'polling'] }),
    );
    expect(ioMock).toHaveBeenNthCalledWith(
      4,
      'https://example.com/avatars',
      expect.objectContaining({ transports: ['websocket', 'polling'] }),
    );
  });
});
