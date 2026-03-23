import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FrontendConfigManager from './FrontendConfigManager';

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('FrontendConfigManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.getItem.mockImplementation((key) => (key === 'token' ? 'test-token' : null));
    globalThis.fetch = vi.fn(async (input, init = {}) => {
      const url = String(input);
      const method = init.method || 'GET';

      if (url.includes('/api/admin/site-blocks') && method === 'GET') {
        return { ok: true, json: async () => ({ data: [] }) };
      }
      if (url.includes('/api/admin/avatars') && method === 'GET') {
        return { ok: true, json: async () => ({ code: 0, data: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  it('只保留左侧内容栏相关配置字段与头像管理区块', async () => {
    renderWithRouter(<FrontendConfigManager />);

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
    renderWithRouter(<FrontendConfigManager />);

    await user.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => {
      expect(globalThis.fetch.mock.calls.some(([url, options]) => (
        String(url).includes('/api/admin/site-blocks') && options?.method === 'PUT'
      ))).toBe(true);
    });

    const [, saveRequest] = globalThis.fetch.mock.calls.find(([url, options]) => (
      String(url).includes('/api/admin/site-blocks') && options?.method === 'PUT'
    ));
    const body = JSON.parse(saveRequest.body);
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

  it('在左侧内容栏页内支持头像上传、删除和设为当前头像', async () => {
    const user = userEvent.setup();
    let avatars = [
      { id: 1, filename: 'avatar-1.png', uploaded_at: '2026-03-23T10:00:00Z' },
      { id: 2, filename: 'avatar-2.png', uploaded_at: '2026-03-24T10:00:00Z' },
    ];

    globalThis.fetch = vi.fn(async (input, init = {}) => {
      const url = String(input);
      const method = init.method || 'GET';

      if (url.includes('/api/admin/site-blocks') && method === 'GET') {
        return { ok: true, json: async () => ({ data: [] }) };
      }

      if (url.includes('/api/admin/avatars') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            code: 0,
            data: avatars,
          }),
        };
      }

      if (url.endsWith('/api/admin/avatars') && method === 'POST') {
        avatars = [
          ...avatars,
          { id: 3, filename: 'avatar-3.png', uploaded_at: '2026-03-25T10:00:00Z' },
        ];
        return { ok: true, json: async () => ({ code: 0, msg: '上传成功' }) };
      }

      if (url.endsWith('/api/admin/avatars/1') && method === 'DELETE') {
        avatars = avatars.filter((item) => item.id !== 1);
        return { ok: true, json: async () => ({ msg: '删除成功' }) };
      }

      if (url.endsWith('/api/admin/avatars/2/set_current') && method === 'PUT') {
        avatars = [
          avatars.find((item) => item.id === 2),
          ...avatars.filter((item) => item.id !== 2),
        ].filter(Boolean);
        return { ok: true, json: async () => ({ msg: '设置成功' }) };
      }

      return { ok: true, json: async () => ({}) };
    });

    renderWithRouter(<FrontendConfigManager />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/avatars'),
        expect.any(Object),
      );
    });
    await screen.findByText('当前头像');

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    const uploadCall = globalThis.fetch.mock.calls.find(([url, options]) => (
      /\/api\/admin\/avatars$/.test(String(url)) && options?.method === 'POST'
    ));
    expect(uploadCall).toBeTruthy();
    expect(uploadCall[1].body).toBeInstanceOf(FormData);
    expect(uploadCall[1].body.get('file')).toBe(file);

    const countAvatarGetCalls = () => globalThis.fetch.mock.calls.filter(([url, options]) => (
      /\/api\/admin\/avatars$/.test(String(url)) && (options?.method === undefined || options?.method === 'GET')
    )).length;

    const getCallsBeforeSetCurrent = countAvatarGetCalls();
    await user.click(screen.getAllByRole('button', { name: '设为当前头像' })[1]);
    await waitFor(() => {
      expect(globalThis.fetch.mock.calls.some(([url, options]) => (
        String(url).includes('/api/admin/avatars/2/set_current') && options?.method === 'PUT'
      ))).toBe(true);
      expect(countAvatarGetCalls()).toBe(getCallsBeforeSetCurrent + 1);
    });

    const getCallsBeforeDelete = countAvatarGetCalls();
    await user.click(screen.getAllByRole('button', { name: '删除头像' })[0]);
    await waitFor(() => {
      expect(globalThis.fetch.mock.calls.some(([url, options]) => (
        /\/api\/admin\/avatars\/\d+$/.test(String(url)) && options?.method === 'DELETE'
      ))).toBe(true);
      expect(countAvatarGetCalls()).toBe(getCallsBeforeDelete + 1);
    });
  });
});
