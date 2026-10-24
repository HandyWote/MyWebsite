import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FrontendConfigManager from './FrontendConfigManager';
import useSiteBlockStore from '../../stores/siteBlockStore';

vi.mock('../../api/browser', () => ({
  browserApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    upload: vi.fn(),
    uploadFiles: vi.fn(),
    download: vi.fn(),
  },
  unwrapApiPayload: (r?: { data?: unknown } | null) => r?.data ?? r,
  getApiMessage: (r?: { msg?: string; message?: string } | null, fb = '') => r?.msg || r?.message || fb,
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));
// Mock useNotification hook (Zustand-backed，扁平 API: notify.success/error)
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
    hide: vi.fn(),
  }),
}));

// Mock AvatarsManager（内部自己走 avatarApi，这里只隔离渲染）
vi.mock('./AvatarsManager', () => ({
  default: () => <div data-testid="avatars-manager">AvatarsManagerMock</div>,
}));

import { browserApi } from '../../api/browser';
import type { SiteBlockPayload } from '@/api/types';

const api = vi.mocked(browserApi);

/**
 * PUT 载荷：browserApi 的 data 参数是 unknown，这里按真实契约（api/types.ts）
 * 只做一次窄化，断言才能读 blocks/content 形状。
 */
const submittedPayload = (): SiteBlockPayload => {
  const payload = api.put.mock.calls[0][1];
  if (!payload) throw new Error('no site-block payload was submitted');
  return payload as SiteBlockPayload;
};

const EMPTY_FORM = {
  home: {
    title: 'HandyWote',
    subtitle: '少年侠气交结五都雄！',
    github_calendar_url: 'https://ghchart.rshah.org/HandyWote',
  },
  sidebar: { social_links: [], education: [], tech_stack: [] },
};

const getSaveButton = () => screen.getByRole('button', { name: '保存配置' });

/** PixelInput(select) 的 combobox 是 testid 容器内的 role=combobox 元素，MUI 用 mousedown 打开菜单。 */
const comboboxOf = (testId: string): Element => {
  const combobox = screen.getByTestId(testId).querySelector('[role="combobox"]');
  if (!combobox) throw new Error(`no combobox inside ${testId}`);
  return combobox;
};

const savedSidebarBlock = () => {
  const block = submittedPayload().blocks.find((item) => item.name === 'sidebar');
  if (!block) throw new Error('sidebar block was not submitted');
  return block;
};

describe('FrontendConfigManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(window.localStorage.getItem).mockImplementation((key) => (key === 'token' ? 'test-token' : null));
    // 组件测试共用真实 store，逐例回到未加载的初始状态
    useSiteBlockStore.setState({
      blocks: [],
      form: EMPTY_FORM,
      loading: false,
      saving: false,
      error: null,
      loaded: false,
    });
    // vitest 的 restoreAllMocks 不清空 vi.fn 的调用记录，逐例显式清理
    api.get.mockClear();
    api.put.mockClear();
    api.put.mockResolvedValue(null);
  });

  it('只保留左侧内容栏相关配置字段与头像管理区块', async () => {
    // api.get returns auto-unwrapped data
    api.get.mockResolvedValue([]);

    render(<FrontendConfigManager />);

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

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(getSaveButton()).toBeEnabled();
    });

    await user.click(getSaveButton());

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

    const savedPayload = submittedPayload();
    const homeBlock = savedPayload.blocks.find((item) => item.name === 'home');
    if (!homeBlock) throw new Error('home block was not submitted');

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

  it('新增的社交链接可以删除，删除后该条不再渲染', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue([]);

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    await user.click(screen.getByTestId('add-sidebar-social-link'));
    await user.type(screen.getByLabelText('链接1名称'), '临时链接');
    expect(screen.getByLabelText('链接1名称')).toHaveValue('临时链接');

    await user.click(screen.getByTestId('remove-sidebar-social-0'));

    expect(screen.queryByLabelText('链接1名称')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-sidebar-social-0')).not.toBeInTheDocument();
  });

  it('教育经历三项时把第二项上移，保存顺序随之改变', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue([{
      name: 'sidebar',
      content: {
        social_links: [],
        tech_stack: [],
        education: [
          { school: '学校A', period: '2019' },
          { school: '学校B', period: '2020' },
          { school: '学校C', period: '2021' },
        ],
      },
    }]);

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(screen.getByLabelText('教育2学校')).toHaveValue('学校B');
    });

    await user.click(screen.getByTestId('move-up-sidebar-education-1'));
    expect(screen.getByLabelText('教育1学校')).toHaveValue('学校B');
    expect(screen.getByLabelText('教育2学校')).toHaveValue('学校A');

    await user.click(getSaveButton());

    await waitFor(() => {
      expect(api.put).toHaveBeenCalled();
    });

    expect(savedSidebarBlock().content.education).toEqual([
      { school: '学校B', period: '2020' },
      { school: '学校A', period: '2019' },
      { school: '学校C', period: '2021' },
    ]);
  });

  it('首项禁上移、末项禁下移', async () => {
    api.get.mockResolvedValue([{
      name: 'sidebar',
      content: {
        social_links: [],
        education: [],
        tech_stack: [{ name: 'Go' }, { name: 'React' }],
      },
    }]);

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(screen.getByLabelText('技术1名称')).toHaveValue('Go');
    });

    expect(screen.getByTestId('move-up-sidebar-tech-0')).toBeDisabled();
    expect(screen.getByTestId('move-down-sidebar-tech-0')).toBeEnabled();
    expect(screen.getByTestId('move-up-sidebar-tech-1')).toBeEnabled();
    expect(screen.getByTestId('move-down-sidebar-tech-1')).toBeDisabled();
  });

  it('修改社交链接图标类型后保存 payload 带新 type', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue([]);

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    await user.click(screen.getByTestId('add-sidebar-social-link'));

    fireEvent.mouseDown(comboboxOf('field-sidebar-social-type-0'));
    await user.click(await screen.findByRole('option', { name: '邮件' }));
    expect(comboboxOf('field-sidebar-social-type-0')).toHaveTextContent('邮件');

    await user.click(getSaveButton());

    await waitFor(() => {
      expect(api.put).toHaveBeenCalled();
    });

    expect(savedSidebarBlock().content.social_links).toEqual([
      expect.objectContaining({ type: 'email' }),
    ]);
  });

  it('新建教育/技术项不制造前台不渲染的无效字段', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue([]);

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    await user.click(screen.getByTestId('add-sidebar-education-item'));
    await user.type(screen.getByLabelText('教育1学校'), '汕大');
    await user.click(screen.getByTestId('add-sidebar-tech-item'));
    await user.type(screen.getByLabelText('技术1名称'), 'Go');

    await user.click(getSaveButton());

    await waitFor(() => {
      expect(api.put).toHaveBeenCalled();
    });

    const sidebarContent = savedSidebarBlock().content;
    expect(sidebarContent.education).toEqual([{ school: '汕大', period: '' }]);
    expect(sidebarContent.tech_stack).toEqual([{ name: 'Go' }]);
    // content 是开放记录（Record<string, unknown>），取首项断言字段集合
    expect((sidebarContent.education as unknown[])[0]).not.toHaveProperty('desc');
    expect((sidebarContent.tech_stack as unknown[])[0]).not.toHaveProperty('level');
  });

  it('首次拉取失败时保存被禁用，且不会发起 PUT 覆盖线上数据', async () => {
    api.get.mockRejectedValue(new Error('network down'));

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(screen.getByTestId('site-blocks-load-error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('site-blocks-load-error')).toHaveTextContent('network down');
    expect(getSaveButton()).toBeDisabled();

    // 禁用按钮用 fireEvent 强点，确认即使触发也拿不到保存路径
    fireEvent.click(getSaveButton());
    await waitFor(() => {
      expect(api.put).not.toHaveBeenCalled();
    });
  });

  it('加载失败后点「重试加载」重新拉取并恢复保存', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValueOnce(new Error('network down'));
    api.get.mockResolvedValueOnce([{ name: 'sidebar', content: { social_links: [], education: [], tech_stack: [] } }]);

    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(screen.getByTestId('site-blocks-load-error')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('retry-load-site-blocks'));

    await waitFor(() => {
      expect(screen.queryByTestId('site-blocks-load-error')).not.toBeInTheDocument();
    });
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(getSaveButton()).toBeEnabled();

    await user.click(getSaveButton());
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledTimes(1);
    });
  });
});
