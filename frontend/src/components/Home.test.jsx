import { act, render } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';

const ioMock = vi.fn();

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
    websocket: () => 'https://example.com',
    siteBlocks: () => '/api/site-blocks',
    skills: () => '/api/skills',
    contacts: () => '/api/contacts',
    avatars: () => '/api/avatars',
    avatarFile: (filename) => `/api/admin/avatars/file/${filename}`,
  },
}));

vi.mock('socket.io-client', () => ({
  default: ioMock,
}));

describe('Home', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    ioMock.mockReset();
    ioMock.mockImplementation(() => ({
      on: vi.fn(),
      disconnect: vi.fn(),
    }));

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ data: [], avatars: [] }),
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('connects to the backend namespaces used by home realtime updates', async () => {
    render(<Home />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(ioMock).toHaveBeenCalledTimes(4);

    expect(ioMock).toHaveBeenNthCalledWith(1, 'https://example.com/site_blocks', expect.any(Object));
    expect(ioMock).toHaveBeenNthCalledWith(2, 'https://example.com/skills', expect.any(Object));
    expect(ioMock).toHaveBeenNthCalledWith(3, 'https://example.com/contacts', expect.any(Object));
    expect(ioMock).toHaveBeenNthCalledWith(4, 'https://example.com/avatars', expect.any(Object));
  });
});
