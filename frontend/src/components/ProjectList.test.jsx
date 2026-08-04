import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import ProjectList from './ProjectList';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      delete props.initial;
      delete props.animate;
      delete props.transition;
      delete props.variants;
      return <div {...props}>{children}</div>;
    },
  },
}));

describe('ProjectList', () => {
  let projectPageConfig;
  const realDateNow = Date.now;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Date.now = realDateNow;
    projectPageConfig = null;
    const pageOneRepos = Array.from({ length: 100 }, (_, index) => ({
      id: 1000 + index,
      name: `repo-seed-${index}`,
      description: `seed repo ${index}`,
      html_url: `https://github.com/HandyWote/repo-seed-${index}`,
      stargazers_count: 1,
      forks_count: 0,
      updated_at: '2026-03-01T00:00:00Z',
      fork: false,
      topics: [],
      language: 'JavaScript',
    }));
    pageOneRepos[0] = {
      id: 1,
      name: 'repo-1',
      description: 'repo 1',
      html_url: 'https://github.com/HandyWote/repo-1',
      stargazers_count: 1,
      forks_count: 0,
      updated_at: '2026-03-03T00:00:00Z',
      fork: false,
      topics: [],
      language: 'JavaScript',
    };
    pageOneRepos[1] = {
      id: 2,
      name: 'repo-fork',
      description: 'forked repo',
      html_url: 'https://github.com/HandyWote/repo-fork',
      stargazers_count: 1,
      forks_count: 1,
      updated_at: '2026-03-01T00:00:00Z',
      fork: true,
      topics: [],
      language: 'TypeScript',
    };

    globalThis.fetch = vi.fn((url) => {
      const requestUrl = String(url);

      if (requestUrl.includes('/api/site-blocks')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: projectPageConfig
              ? [{ name: 'projects_page', content: projectPageConfig }]
              : [],
          }),
        });
      }

      if (requestUrl.includes('page=2')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              id: 3,
              name: 'repo-3',
              description: 'repo 3',
              html_url: 'https://github.com/HandyWote/repo-3',
              stargazers_count: 1,
              forks_count: 0,
              updated_at: '2026-03-02T00:00:00Z',
              fork: false,
              topics: [],
              language: 'Go',
            },
          ]),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => pageOneRepos,
      });
    });
  });

  it('fetches all repository pages and shows all repos', async () => {
    render(<ProjectList />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    expect(
      globalThis.fetch.mock.calls.some(([requestUrl]) =>
        String(requestUrl).includes('/api/site-blocks')
      )
    ).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('page=1'),
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.any(Object),
    );

    expect(await screen.findByText('repo-1')).toBeInTheDocument();
    expect(screen.getByText('repo-fork')).toBeInTheDocument();
    expect(screen.getByText('repo-3')).toBeInTheDocument();
    expect(screen.getByText('found 101 repositories')).toBeInTheDocument();
  });

  it('uses projects_page github_username and per_page to build github request', async () => {
    projectPageConfig = {
      github_username: 'ConfigUser',
      per_page: 50,
      sort: 'created',
    };

    render(<ProjectList />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('users/ConfigUser/repos?sort=created&per_page=50&page=1'),
        expect.any(Object),
      );
    });
  });

  it('uses 3-hour local cache to avoid extra GitHub requests', async () => {
    projectPageConfig = {
      github_username: 'ConfigUser',
      per_page: 50,
      sort: 'created',
    };

    const cachePayload = JSON.stringify({
      timestamp: Date.now(),
      data: [
        {
          id: 999,
          name: 'cached-repo',
          description: 'cached description',
          topics: ['cached-topic'],
          language: 'JavaScript',
          stargazers_count: 5,
          forks_count: 1,
          updated_at: new Date().toISOString(),
          html_url: 'https://github.com/ConfigUser/cached-repo',
        },
      ],
    });

    window.localStorage.setItem('github_repos:ConfigUser:created:50', cachePayload);

    render(<ProjectList />);

    const cachedProject = await screen.findByRole('link', { name: /cached-repo/i });
    expect(cachedProject).toHaveAttribute('href', 'https://github.com/ConfigUser/cached-repo');
    expect(screen.getByText('cached description')).toBeInTheDocument();
    expect(screen.getByText('cached-topic')).toBeInTheDocument();
    expect(screen.getByText('★ 5 · ⑂ 1 · updated today')).toBeInTheDocument();
    expect(screen.getByText('found 1 repositories')).toBeInTheDocument();

    expect(
      globalThis.fetch.mock.calls.some(([requestUrl]) =>
        String(requestUrl).includes('api.github.com/users/ConfigUser/repos')
      )
    ).toBe(false);
  });

  it('falls back to stale cache when GitHub request fails', async () => {
    projectPageConfig = {
      github_username: 'ConfigUser',
      per_page: 50,
      sort: 'created',
    };

    const stalePayload = JSON.stringify({
      timestamp: Date.now() - (4 * 60 * 60 * 1000),
      data: [
        {
          id: 888,
          name: 'stale-repo',
          description: 'stale',
          topics: ['legacy'],
          language: 'TypeScript',
          stargazers_count: 3,
          forks_count: 0,
          updated_at: new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString(),
          html_url: 'https://github.com/ConfigUser/stale-repo',
        },
      ],
    });

    window.localStorage.setItem('github_repos:ConfigUser:created:50', stalePayload);

    globalThis.fetch = vi.fn((url) => {
      const requestUrl = String(url);
      if (requestUrl.includes('/api/site-blocks')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ name: 'projects_page', content: projectPageConfig }],
          }),
        });
      }

      return Promise.resolve({
        ok: false,
        status: 502,
        json: async () => ([]),
      });
    });

    render(<ProjectList />);

    const staleProject = await screen.findByRole('link', { name: /stale-repo/i });
    expect(staleProject).toHaveAttribute('href', 'https://github.com/ConfigUser/stale-repo');
    expect(screen.getByText('legacy')).toBeInTheDocument();
    expect(screen.getByText('★ 3 · ⑂ 0 · updated yesterday')).toBeInTheDocument();
    expect(screen.getByText('found 1 repositories')).toBeInTheDocument();
  });
});
