import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import AdminRoutes from '../routes';

const navigateMock = vi.fn();

vi.mock('../components/Login', () => ({ default: () => <div>登录页</div> }));
vi.mock('../components/ArticlesManager', () => ({ default: () => <div>Articles页</div> }));
vi.mock('../components/CommentsManager', () => ({ default: () => <div>Comments页</div> }));
vi.mock('../components/DataImportExport', () => ({ default: () => <div>Data页</div> }));
vi.mock('../components/FrontendConfigManager', () => ({ default: () => <div>左侧内容栏管理页</div> }));

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: () => false,
  };
});

vi.mock('lucide-react', () => ({
  FileText: () => <span>FileText</span>,
  MessageSquare: () => <span>MessageSquare</span>,
  Settings: () => <span>Settings</span>,
  LogOut: () => <span>LogOut</span>,
}));

vi.mock('../utils/auth', () => ({
  verifyToken: vi.fn(async () => ({ valid: true })),
  clearAuth: vi.fn(),
  saveRedirectPath: vi.fn(),
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only the three simplified top-level sections', () => {
    render(
      <MemoryRouter initialEntries={['/admin/sidebar']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="sidebar" element={<div>左侧内容栏管理页</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('左侧内容栏')).toBeInTheDocument();
    expect(screen.getByText('Articles')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();

    expect(screen.queryByText('Frontend')).not.toBeInTheDocument();
    expect(screen.queryByText('Skills')).not.toBeInTheDocument();
    expect(screen.queryByText('Contacts')).not.toBeInTheDocument();
    expect(screen.queryByText('Avatars')).not.toBeInTheDocument();
  });

  it('routes /admin to sidebar content manager by default', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('左侧内容栏管理页')).toBeInTheDocument();
    });
  });
});
