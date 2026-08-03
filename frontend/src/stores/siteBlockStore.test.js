// frontend/src/stores/siteBlockStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useSiteBlockStore from './siteBlockStore';

vi.mock('@/config/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    post: vi.fn(),
    upload: vi.fn(),
  },
  uploadFile: vi.fn(),
  getApiUrl: {
    adminSiteBlocks: () => '/api/admin/site-blocks',
  },
  unwrapApiPayload: (r) => r?.data ?? r,
  API_ENDPOINTS: {
    PUBLIC: {},
    ADMIN: {
      SITE_BLOCKS: '/api/admin/site-blocks',
    },
  },
  default: {},
}));

vi.mock('@/config/siteBlocks', () => ({
  getBlockContent: (blocks, name) => {
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

import { api, getApiUrl } from '@/config/api';

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
    });

    it('应该处理获取失败', async () => {
      api.get.mockRejectedValueOnce(new Error('Fetch failed'));

      await expect(
        act(async () => {
          await useSiteBlockStore.getState().fetchBlocks();
        })
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

      await expect(
        act(async () => {
          await useSiteBlockStore.getState().saveBlocks();
        })
      ).rejects.toThrow('Save failed');

      expect(useSiteBlockStore.getState().saving).toBe(false);
      expect(useSiteBlockStore.getState().error).toBe('Save failed');
    });
  });
});
