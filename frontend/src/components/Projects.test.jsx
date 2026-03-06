import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Projects from './Projects';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      delete props.whileInView;
      delete props.viewport;
      delete props.variants;
      delete props.custom;
      delete props.initial;
      delete props.animate;
      delete props.transition;
      return <div {...props}>{children}</div>;
    },
  },
}));

vi.mock('@mui/icons-material/GitHub', () => ({
  default: () => <span>GitHubIcon</span>,
}));

vi.mock('@mui/icons-material/Refresh', () => ({
  default: () => <span>RefreshIcon</span>,
}));

describe('Projects', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === 'githubProjects') return '{bad json';
      return null;
    });
    window.localStorage.removeItem.mockReset();
    window.localStorage.setItem.mockReset();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          name: 'fresh-project',
          description: '来自 GitHub 的项目',
          html_url: 'https://github.com/HandyWote/fresh-project',
          stargazers_count: 5,
          updated_at: '2026-03-06T10:00:00.000Z',
          fork: false,
        },
      ]),
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('缓存损坏时仍继续请求 GitHub 并显示远端数据', async () => {
    render(<Projects />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.github.com/users/HandyWote/repos',
        expect.any(Object),
      );
    });

    expect(await screen.findByText('fresh-project')).toBeInTheDocument();
    expect(screen.queryByText('WechatAutoRobort')).not.toBeInTheDocument();
  });
});
