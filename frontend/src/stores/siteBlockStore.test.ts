// frontend/src/stores/siteBlockStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useSiteBlockStore from './siteBlockStore';

/** 传输层 mock：站点内容域 API 只依赖 browserApi，所有断言都从这组 vi.fn() 读取。 */
const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  upload: vi.fn(),
  uploadFiles: vi.fn(),
  download: vi.fn(),
}));

vi.mock('@/api/browser', () => ({
  browserApi: apiMock,
  unwrapApiPayload: (r?: { data?: unknown }) => r?.data ?? r,
  getApiMessage: (r?: { msg?: string; message?: string }, fallback = '') =>
    r?.msg || r?.message || fallback,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));
vi.mock('@/config/siteBlocks', () => ({
  getBlockContent: (
    blocks: Array<{ name?: string; content?: Record<string, unknown> }> | undefined,
    name: string,
  ) => {
    const found = (blocks || []).find((b) => b?.name === name);
    return found?.content || {};
  },
  SITE_BLOCK_DEFAULTS: {
    home: {
      title: 'Default',
      subtitle: 'Default subtitle',
      github_calendar_url: '',
      author: 'author',
      github_url: '',
      contact_description: '',
    },
    sidebar: {
      social_links: [],
      education: [],
      tech_stack: [],
    },
  },
}));

/** 与线上模块同名，断言读起来与实现一致。 */
const api = apiMock;

describe('siteBlockStore', () => {
  beforeEach(() => {
    useSiteBlockStore.setState({
      blocks: [],
      form: {
        home: { title: 'Default', subtitle: 'Default subtitle', github_calendar_url: '' },
        sidebar: { social_links: [], education: [], tech_stack: [] },
      },
      loading: false,
      saving: false,
      error: null,
      loaded: false,
    });
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useSiteBlockStore.getState();
      expect(state.blocks).toEqual([]);
      expect(state.form.home.title).toBe('Default');
      expect(state.loading).toBe(false);
      expect(state.saving).toBe(false);
      expect(state.error).toBe(null);
      expect(state.loaded).toBe(false);
    });
  });

  describe('fetchBlocks', () => {
    it('应该成功获取 blocks 并填充 form', async () => {
      api.get.mockResolvedValueOnce([
        { name: 'home', content: { title: 'My Title', subtitle: 'My Subtitle', github_calendar_url: 'https://...' } },
        { name: 'sidebar', content: { social_links: [{ label: 'GitHub', href: 'https://github.com' }] } },
      ]);

      await act(async () => {
        await useSiteBlockStore.getState().fetchBlocks();
      });

      const state = useSiteBlockStore.getState();
      expect(state.blocks).toHaveLength(2);
      expect(state.form.home.title).toBe('My Title');
      expect(state.form.sidebar.social_links).toHaveLength(1);
      expect(state.loading).toBe(false);
      expect(state.loaded).toBe(true);
    });

    it('获取失败时应把 loaded 置为 false（表单不可信，禁止保存）', async () => {
      api.get.mockRejectedValueOnce(new Error('Fetch failed'));

      await expect(
        useSiteBlockStore.getState().fetchBlocks()
      ).rejects.toThrow('Fetch failed');

      expect(useSiteBlockStore.getState().loaded).toBe(false);
    });

    it('应该处理获取失败', async () => {
      api.get.mockRejectedValueOnce(new Error('Fetch failed'));

      // zustand store 断言不需要 React act，避免 React 19 act 的微任务时序陷阱
      await expect(
        useSiteBlockStore.getState().fetchBlocks()
      ).rejects.toThrow('Fetch failed');

      expect(useSiteBlockStore.getState().error).toBe('Fetch failed');
    });
  });

  describe('updateForm', () => {
    it('应该支持函数式更新', () => {
      useSiteBlockStore.getState().updateForm((prev) => ({
        ...prev,
        home: { ...prev.home, title: 'Updated' },
      }));

      expect(useSiteBlockStore.getState().form.home.title).toBe('Updated');
    });

    it('应该支持直接替换 form', () => {
      const newForm = {
        home: { title: 'New', subtitle: 'Sub', github_calendar_url: '' },
        sidebar: { social_links: [] },
      };
      useSiteBlockStore.getState().updateForm(newForm);

      expect(useSiteBlockStore.getState().form).toEqual(newForm);
    });
  });

  describe('saveBlocks', () => {
    it('应该成功保存 blocks', async () => {
      api.put.mockResolvedValueOnce({});

      useSiteBlockStore.setState({
        loaded: true,
        form: {
          home: { title: 'My Title', subtitle: 'Sub', github_calendar_url: 'https://...' },
          sidebar: { social_links: [] },
        },
      });

      await act(async () => {
        await useSiteBlockStore.getState().saveBlocks();
      });

      expect(api.put).toHaveBeenCalledWith('/api/admin/site-blocks', expect.objectContaining({
        blocks: expect.arrayContaining([
          expect.objectContaining({ name: 'home' }),
          expect.objectContaining({ name: 'sidebar' }),
        ]),
      }));
      expect(useSiteBlockStore.getState().saving).toBe(false);
    });

    it('应该处理保存失败', async () => {
      api.put.mockRejectedValueOnce(new Error('Save failed'));

      useSiteBlockStore.setState({ loaded: true });

      await expect(
        useSiteBlockStore.getState().saveBlocks()
      ).rejects.toThrow('Save failed');

      expect(useSiteBlockStore.getState().saving).toBe(false);
      expect(useSiteBlockStore.getState().error).toBe('Save failed');
    });

    it('未成功加载时拒绝保存且不发起 PUT', async () => {
      await expect(
        useSiteBlockStore.getState().saveBlocks()
      ).rejects.toThrow(/尚未加载成功/);

      expect(api.put).not.toHaveBeenCalled();
      expect(useSiteBlockStore.getState().saving).toBe(false);
    });

    it('重新加载失败后已加载标记回落，保存再次被拒绝', async () => {
      api.get.mockResolvedValueOnce([{ name: 'home', content: { title: 'Real' } }]);
      await useSiteBlockStore.getState().fetchBlocks();
      expect(useSiteBlockStore.getState().loaded).toBe(true);

      api.get.mockRejectedValueOnce(new Error('Reload failed'));
      await expect(useSiteBlockStore.getState().fetchBlocks()).rejects.toThrow('Reload failed');

      expect(useSiteBlockStore.getState().loaded).toBe(false);
      await expect(useSiteBlockStore.getState().saveBlocks()).rejects.toThrow(/尚未加载成功/);
      expect(api.put).not.toHaveBeenCalled();
    });
  });
});
