import { act, render } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@mui/material', () => ({
  Box: ({ children, ...props }) => <div {...props}>{children}</div>,
  Typography: ({ children }) => <div>{children}</div>,
  Container: ({ children, ...props }) => <div {...props}>{children}</div>,
  Button: ({ children, href }) => <a href={href}>{children}</a>,
}));

vi.mock('@mui/icons-material/GitHub', () => ({
  default: () => <span>GitHubIcon</span>,
}));

vi.mock('./LazyImage', () => ({
  default: (props) => <img alt={props.alt} src={props.src} />,
}));

vi.mock('./LazyGitHubCalendar', () => ({
  default: () => <div>GitHubCalendar</div>,
}));

vi.mock('./SkillsSection', () => ({
  default: () => <div>SkillsSection</div>,
}));

vi.mock('./ContactSection', () => ({
  default: () => <div>ContactSection</div>,
}));

vi.mock('../config/api', () => ({
  getApiUrl: {
    baseUrl: () => 'https://example.com',
    siteBlocks: () => '/api/site-blocks',
    skills: () => '/api/skills',
    contacts: () => '/api/contacts',
    avatars: () => '/api/avatars',
    avatarFile: (filename) => `/api/admin/avatars/file/${filename}`,
  },
}));

describe('Home', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ data: [], avatars: [] }),
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads homepage data only through HTTP APIs', async () => {
    render(<Home />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/site-blocks');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/skills');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/contacts');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/avatars');
  });
});
