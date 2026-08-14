import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLayout from './AdminLayout';

const { pushMock, replaceMock } = vi.hoisted(() => ({ pushMock: vi.fn(), replaceMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/sidebar',
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return { ...actual, useMediaQuery: () => false };
});

vi.mock('lucide-react', () => ({
  Database: () => <span>Database</span>,
  FileText: () => <span>FileText</span>,
  MessageSquare: () => <span>MessageSquare</span>,
  Settings: () => <span>Settings</span>,
  LogOut: () => <span>LogOut</span>,
}));

vi.mock('../utils/auth', () => ({
  verifyToken: vi.fn(async () => ({ valid: true })),
  clearAuth: vi.fn(),
}));

vi.mock('../../config/api', () => ({
  API_ENDPOINTS: { ADMIN: { LOGOUT: '/api/admin/logout' } },
  api: { post: vi.fn().mockResolvedValue(null) },
}));

vi.mock('@/stores/notificationStore', () => ({
  useNotificationStore: () => ({ open: false, message: '', severity: 'info', hide: vi.fn() }),
}));

describe('AdminLayout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders every reachable admin section and App Router child content', () => {
    render(<AdminLayout><div>左侧内容栏管理页</div></AdminLayout>);
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Articles')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('左侧内容栏管理页')).toBeInTheDocument();
    expect(screen.queryByText('Avatars')).not.toBeInTheDocument();
  });

  it('uses Next router for tab navigation', () => {
    render(<AdminLayout><div>content</div></AdminLayout>);
    fireEvent.click(screen.getByRole('tab', { name: /Data/ }));
    expect(pushMock).toHaveBeenCalledWith('/admin/data');
  });
});
