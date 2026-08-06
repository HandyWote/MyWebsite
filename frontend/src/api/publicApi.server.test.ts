import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearProjectsStaleFallback,
  getArticle,
  getArticlePage,
  getProjects,
  getPublicProfile,
  getSitemapArticlePage,
  formatListDate,
} from './publicApi.server';

const { serverRequestMock } = vi.hoisted(() => ({ serverRequestMock: vi.fn() }));

vi.mock('./server', () => ({ serverRequest: serverRequestMock }));

const repo = (id: number) => ({
  id,
  name: `repo-${id}`,
  description: id === 105 ? null : `description-${id}`,
  topics: id === 105 ? ['next', 'react', 'go', 'ignored'] : [],
  language: 'TypeScript',
  stargazers_count: id,
  forks_count: id + 1,
  updated_at: '2026-07-30T00:00:00Z',
  html_url: `https://github.com/octocat/repo-${id}`,
});

const response = (repos: ReturnType<typeof repo>[], ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(repos),
});

const projectsBlock = (perPage = 100) => [{
  name: 'projects_page',
  content: { github_username: 'octocat', sort: 'updated', per_page: perPage },
}];

describe('formatListDate', () => {
  it('formats a UTC timestamp as a short month/day without year', () => {
    expect(formatListDate('2026-08-01T00:00:00Z')).toBe('Aug 1');
  });
  it('returns an empty string for missing or invalid values', () => {
    expect(formatListDate()).toBe('');
    expect(formatListDate('not-a-date')).toBe('');
  });
});

describe('public server data cache policies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses explicit 24 hour list, detail, sitemap, site-block, and profile policies', async () => {
    serverRequestMock
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await getArticlePage(2, 10);
    await getArticle('42');
    await getSitemapArticlePage(3, 100);
    await getPublicProfile();

    expect(serverRequestMock.mock.calls).toEqual([
      ['/api/articles?page=2&per_page=10', { cache: 'force-cache', next: { revalidate: 86400, tags: ['articles:list'] } }],
      ['/api/articles/42', { cache: 'force-cache', next: { revalidate: 86400, tags: ['article:42'] } }],
      ['/api/articles?page=3&per_page=100', { cache: 'force-cache', next: { revalidate: 86400, tags: ['articles:list', 'sitemap'] } }],
      ['/api/site-blocks', { cache: 'force-cache', next: { revalidate: 86400, tags: ['site-blocks'] } }],
      ['/api/avatars', { cache: 'force-cache', next: { revalidate: 86400, tags: ['profile'] } }],
    ]);
  });
});

describe('getProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProjectsStaleFallback();
    serverRequestMock.mockResolvedValue(projectsBlock());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches and maps every GitHub repository across cached pages', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => repo(index + 1));
    const secondPage = Array.from({ length: 5 }, (_, index) => repo(index + 101));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(firstPage))
      .mockResolvedValueOnce(response(secondPage));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getProjects();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('per_page=100&page=1');
    expect(fetchMock.mock.calls[1][0]).toContain('per_page=100&page=2');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      cache: 'force-cache',
      next: { revalidate: 10800, tags: ['projects'] },
    }));
    expect(result.error).toBe('');
    expect(result.stale).toBe(false);
    expect(result.projects).toHaveLength(105);
    expect(result.projects[0]).toMatchObject({
      id: 105,
      name: 'repo-105',
      description: '暂无描述',
      tags: ['next', 'react', 'go'],
      stars: 105,
      forks: 106,
      url: 'https://github.com/octocat/repo-105',
    });
  });

  it('serves the last complete project set when a refresh fails', async () => {
    serverRequestMock.mockResolvedValue(projectsBlock(2));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([repo(1), repo(2)]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([], false, 503));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getProjects()).resolves.toMatchObject({ stale: false, error: '', projects: [{ id: 2 }, { id: 1 }] });
    await expect(getProjects()).resolves.toMatchObject({ stale: true, error: '', projects: [{ id: 2 }, { id: 1 }] });
  });

  it('returns an observable error when no stale result exists', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => repo(index + 1));
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(firstPage))
      .mockResolvedValueOnce(response([], false, 503)));

    await expect(getProjects()).resolves.toMatchObject({
      projects: [],
      stale: false,
      error: 'GitHub API error: 503',
    });
  });
});
