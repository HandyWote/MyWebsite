import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FrontendConfigManager from './FrontendConfigManager';

describe('FrontendConfigManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.getItem.mockImplementation((key) => (key === 'token' ? 'test-token' : null));
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }));
  });

  it('只保留左侧内容栏相关配置字段与头像管理区块', async () => {
    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
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
    render(<FrontendConfigManager />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    const [, saveRequest] = globalThis.fetch.mock.calls;
    const body = JSON.parse(saveRequest[1].body);
    const homeBlock = body.blocks.find((item) => item.name === 'home');

    expect(body.blocks.map((item) => item.name)).toEqual(['home', 'sidebar']);
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
