import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Sidebar from './Sidebar';

const mockGitHubActivity = vi.fn(({ username }) => (
  <div data-testid="github-activity" data-username={username} />
));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('../config/api', () => ({
  getApiUrl: {
    siteBlocks: () => '/api/site-blocks',
  },
  unwrapApiPayload: (data) => data?.data || [],
}));

vi.mock('./pixel/ui/PixelAvatar', () => ({
  default: () => <div data-testid="pixel-avatar" />,
}));

vi.mock('./pixel/layout/PixelContainer', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('./sidebar/SocialLinks', () => ({
  default: () => <div data-testid="social-links" />,
}));

vi.mock('./sidebar/Education', () => ({
  default: () => <div data-testid="education" />,
}));

vi.mock('./sidebar/TechStack', () => ({
  default: () => <div data-testid="tech-stack" />,
}));

vi.mock('./sidebar/GitHubActivity', () => ({
  default: (props) => mockGitHubActivity(props),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes configured GitHub username to GitHubActivity', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        data: [{ name: 'home', github_calendar_url: 'octocat' }],
      }),
    });

    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByTestId('github-activity')).toHaveAttribute('data-username', 'octocat');
    });
  });

  it('falls back to default GitHub username when config is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        data: [{ name: 'home' }],
      }),
    });

    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByTestId('github-activity')).toHaveAttribute('data-username', 'HandyWote');
    });
  });
});
