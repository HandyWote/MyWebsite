import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProjects } from './publicApi.server';

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

describe('getProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverRequestMock.mockResolvedValue([{
      name: 'projects_page',
      content: { github_username: 'octocat', sort: 'updated', per_page: 100 },
    }]);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches and maps every GitHub repository across pages', async () => {
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
    expect(result.error).toBe('');
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

  it('returns the existing empty error fallback when a later page fails', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => repo(index + 1));
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(firstPage))
      .mockResolvedValueOnce(response([], false, 503)));

    await expect(getProjects()).resolves.toMatchObject({
      projects: [],
      error: 'GitHub API error: 503',
    });
  });
});
