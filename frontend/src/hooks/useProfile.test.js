import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfile } from './useProfile';

vi.mock('@/config/api', () => {
  const adminEndpoints = {};
  return {
    api: {
      get: vi.fn(),
    },
    getApiUrl: {
      avatarFile: (filename) => `/api/avatars/file/${filename}`,
    },
    API_ENDPOINTS: {
      PUBLIC: {
        SITE_BLOCKS: '/api/site-blocks',
        AVATARS: '/api/avatars',
      },
      ADMIN: adminEndpoints,
    },
    default: {},
  };
});

vi.mock('@/config/siteBlocks', () => ({
  getBlockContent: (blocks, name) => {
    const found = (blocks || []).find((b) => b?.name === name);
    return found?.content || {};
  },
  SITE_BLOCK_DEFAULTS: {
    home: { title: 'Default', subtitle: 'Default subtitle', github_calendar_url: '' },
    sidebar: { social_links: [], education: [], tech_stack: [] },
  },
}));

import { api, getApiUrl } from '@/config/api';

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该并行拉取 site-blocks 与 avatars 并解析当前头像', async () => {
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/api/site-blocks') {
        return Promise.resolve([
          { name: 'home', content: { title: 'HandyWote', subtitle: 'hi' } },
          { name: 'sidebar', content: { social_links: [] } },
        ]);
      }
      return Promise.resolve([{ filename: 'me.webp', is_current: true }]);
    });

    const { result } = renderHook(() => useProfile({ fallbackAvatar: '/fallback.webp' }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.homeBlock.title).toBe('HandyWote');
    expect(result.current.avatarUrl).toBe(getApiUrl.avatarFile('me.webp'));
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('无当前头像时回退到 fallbackAvatar', async () => {
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/api/site-blocks') return Promise.resolve([]);
      return Promise.resolve([{ filename: 'old.webp', is_current: false }]);
    });

    const { result } = renderHook(() => useProfile({ fallbackAvatar: '/fallback.webp' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.avatarUrl).toBe('/fallback.webp');
  });

  it('请求失败时回退到 fallbackAvatar 且不抛错', async () => {
    api.get.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useProfile({ fallbackAvatar: '/fallback.webp' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.avatarUrl).toBe('/fallback.webp');
  });
});
