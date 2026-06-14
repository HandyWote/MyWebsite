import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FrontendConfigManager from './FrontendConfigManager';

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

// Mock the unified api module
vi.mock('../../config/api', () => ({
  getApiUrl: {
    adminSiteBlocks: () => '/api/admin/site-blocks',
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

// Mock AvatarsManager (which also depends on config/api internally)
vi.mock('./AvatarsManager', () => ({
  default: () => <div data-testid="avatars-manager">AvatarsManagerMock</div>,
}));

import { api } from '../../config/api';

describe('FrontendConfigManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.getItem.mockImplementation((key) => (key === 'token' ? 'test-token' : null));
  });

  it('只保留左侧内容栏相关配置字段与头像管理区块', async () => {
    // api.get returns auto-unwrapped data
    api.get.mockResolvedValue([]);

    renderWithRouter(<FrontendConfigManager />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    expect(screen.getByText('头像管理')).toBeInTheDocument();
    expect(screen.getByLabelText('首页标题')).toBeInTheDocument();
    expect(screen.getByLabelText('首页副标题')).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub 日历源')).toBeInTheDocument();
    expect(screen.getByText('侧边栏社交链接')).toBeInTheDocument();
    expect(screen.getByText('侧边栏教育经历')).toBeInTheDocument();
    expect(screen.getByText('侧边栏技术栈')).toBeInTheDocument();

    expect(screen.queryByLabelText('作者信息')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('GitHub 链接')).not.toBeInTheDocument();
    expect(screen.queryByText('关于页配置')).not.toBeInTheDocument();
    expect(screen.queryByText('项目页配置')).not.toBeInTheDocument();
    expect(screen.queryByText('全局扩展配置（JSON）')).not.toBeInTheDocument();
  });

  it('保存时只提交允许的 home 与 sidebar 字段', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue([]);
    api.put.mockResolvedValue(null);

    renderWithRouter(<FrontendConfigManager />);

    await user.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/api/admin/site-blocks',
        expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({ name: 'home' }),
            expect.objectContaining({ name: 'sidebar' }),
          ]),
        })
      );
    });

    const savedPayload = api.put.mock.calls[0][1];
    const homeBlock = savedPayload.blocks.find((item) => item.name === 'home');

    expect(savedPayload.blocks.map((item) => item.name)).toEqual(['home', 'sidebar']);
    expect(homeBlock.content).toEqual({
      title: expect.any(String),
      subtitle: expect.any(String),
      github_calendar_url: expect.any(String),
    });
    expect(homeBlock.content.author).toBeUndefined();
    expect(homeBlock.content.github_url).toBeUndefined();
    expect(homeBlock.content.contact_description).toBeUndefined();
  });
});
