import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildGithubCacheKey,
  fetchGithubRepos,
  normalizeGitHubUsername,
  readGithubCache,
} from './github';

const MOCK_REPO = (id, name) => ({
  id,
  name,
  description: `desc-${name}`,
  topics: ['react'],
  language: 'JavaScript',
  stargazers_count: 3,
  forks_count: 1,
  updated_at: '2024-01-01T00:00:00Z',
  html_url: `https://github.com/user/${name}`,
});

describe('normalizeGitHubUsername', () => {
  it('应该保留纯用户名', () => {
    expect(normalizeGitHubUsername('HandyWote')).toBe('HandyWote');
  });

  it('应该从 GitHub URL 提取用户名', () => {
    expect(normalizeGitHubUsername('https://github.com/HandyWote')).toBe('HandyWote');
  });

  it('空值回退到默认用户名', () => {
    expect(normalizeGitHubUsername('')).toBe('HandyWote');
    expect(normalizeGitHubUsername(null)).toBe('HandyWote');
  });
});

describe('fetchGithubRepos', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该分页拉取全部仓库并写缓存', async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [MOCK_REPO(1, 'a'), MOCK_REPO(2, 'b')],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    const repos = await fetchGithubRepos('HandyWote', { sort: 'updated', perPage: 2 });

    expect(repos).toHaveLength(2);
    // 第二页返回空 → 停止分页
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain('per_page=2&page=1');
    expect(String(globalThis.fetch.mock.calls[1][0])).toContain('page=2');

    // 缓存已写入
    const cacheKey = buildGithubCacheKey('HandyWote', 'updated', 2);
    const cached = readGithubCache(cacheKey);
    expect(cached?.data).toHaveLength(2);
  });

  it('缓存未过期时不再请求网络', async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [MOCK_REPO(1, 'a'), MOCK_REPO(2, 'b')],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    await fetchGithubRepos('HandyWote', { perPage: 2 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    // 第二次调用命中缓存，不再发网络请求
    const repos = await fetchGithubRepos('HandyWote', { perPage: 2 });
    expect(repos).toHaveLength(2);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('GitHub API 失败时抛出异常', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: false, status: 403 });

    await expect(fetchGithubRepos('HandyWote', { perPage: 30 })).rejects.toThrow(
      'GitHub API error: 403'
    );
  });
});
