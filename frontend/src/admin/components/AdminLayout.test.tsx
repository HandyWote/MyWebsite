import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLayout from './AdminLayout';

const { pushMock, replaceMock, logoutMock, hideMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  logoutMock: vi.fn().mockResolvedValue(null),
  hideMock: vi.fn(),
}));

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
  PenTool: () => <span>PenTool</span>,
  Settings: () => <span>Settings</span>,
  LogOut: () => <span>LogOut</span>,
}));

vi.mock('../utils/auth', () => ({
  clearAuth: vi.fn(),
}));

vi.mock('../../api/authApi', () => ({
  authApi: { logout: logoutMock },
}));

vi.mock('../../hooks/useNotification', () => ({
  default: () => ({
    open: false,
    message: '',
    severity: 'info',
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    show: vi.fn(),
    hide: hideMock,
  }),
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

  it('登出走 authApi.logout 并回首页（壳不再自行验票）', async () => {
    render(<AdminLayout><div>content</div></AdminLayout>);
    fireEvent.click(screen.getByRole('button', { name: /Logout/ }));

    expect(await screen.findByRole('button', { name: /Logout/ })).toBeInTheDocument();
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/');
  });
});
