import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteContentEditor from './SiteContentEditor';
import AvatarsManager from './AvatarsManager';
import FrontendConfigManager from './FrontendConfigManager';

vi.mock('../../config/api', () => ({
  getApiUrl: {
    baseUrl: () => 'https://example.com',
    adminSiteBlocks: () => '/api/admin/site_blocks',
    adminAvatars: () => '/api/admin/avatars',
    adminAvatarFile: (filename) => `/api/admin/avatars/file/${filename}`,
  },
  unwrapApiPayload: (data) => data?.data || [],
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
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

describe('Admin pages without sockets', () => {
  beforeEach(() => {
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

      return {
        ok: true,
        json: async () => ({ data: [], avatars: [] }),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not initialize socket.io connections', async () => {
    render(<SiteContentEditor />);
    render(<AvatarsManager />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  it('loads and saves frontend blocks via admin site-blocks api', async () => {
    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/admin/site_blocks',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    fireEvent.click(screen.getByText('保存配置'));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/admin/site_blocks',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  it('supports structured fields and persists edited home title', async () => {
    let putBody = null;
    globalThis.fetch = vi.fn(async (input, init = {}) => {
      const url = String(input);
      if (url.includes('/site_blocks') && init.method === 'PUT') {
        putBody = init.body;
      }
      return {
        ok: true,
        json: async () => ({ code: 0, data: [] }),
      };
    });

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(screen.getByText('首页配置')).toBeTruthy();
    });

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: '新的标题' },
    });
    fireEvent.click(screen.getByText('保存配置'));

    await waitFor(() => {
      expect(putBody).toBeTruthy();
    });

    const parsed = JSON.parse(putBody);
    const homeBlock = parsed.blocks.find((item) => item.name === 'home');
    expect(homeBlock.content.title).toBe('新的标题');
  });

  it('persists edited about fields and sidebar social/education/tech rows', async () => {
    let putBody = null;
    globalThis.fetch = vi.fn(async (input, init = {}) => {
      const url = String(input);
      if (url.includes('/site_blocks') && init.method === 'PUT') {
        putBody = init.body;
      }
      return {
        ok: true,
        json: async () => ({ code: 0, data: [] }),
      };
    });

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(screen.getByText('关于页配置')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('field-about-education'), {
      target: { value: '新的教育背景' },
    });
    fireEvent.click(screen.getByTestId('add-sidebar-social-link'));
    fireEvent.change(screen.getByTestId('field-sidebar-social-label-0'), {
      target: { value: 'Blog' },
    });
    fireEvent.change(screen.getByTestId('field-sidebar-social-href-0'), {
      target: { value: 'https://example.com' },
    });

    fireEvent.click(screen.getByTestId('add-sidebar-education-item'));
    fireEvent.change(screen.getByTestId('field-sidebar-education-school-0'), {
      target: { value: 'Shantou University' },
    });
    fireEvent.change(screen.getByTestId('field-sidebar-education-period-0'), {
      target: { value: '2022-2026' },
    });

    fireEvent.click(screen.getByTestId('add-sidebar-tech-item'));
    fireEvent.change(screen.getByTestId('field-sidebar-tech-name-0'), {
      target: { value: 'Rust' },
    });

    fireEvent.click(screen.getByText('保存配置'));

    await waitFor(() => {
      expect(putBody).toBeTruthy();
    });

    const parsed = JSON.parse(putBody);
    const aboutBlock = parsed.blocks.find((item) => item.name === 'about');
    const sidebarBlock = parsed.blocks.find((item) => item.name === 'sidebar');
    expect(aboutBlock.content.education_background).toBe('新的教育背景');
    expect(sidebarBlock.content.social_links[0].label).toBe('Blog');
    expect(sidebarBlock.content.social_links[0].href).toBe('https://example.com');
    expect(sidebarBlock.content.education[0].school).toBe('Shantou University');
    expect(sidebarBlock.content.education[0].period).toBe('2022-2026');
    expect(sidebarBlock.content.tech_stack[0].name).toBe('Rust');
  });
});
