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
    avatars: () => '/api/avatars',
    avatarFile: (filename) => `/api/admin/avatars/file/${filename}`,
  },
  unwrapApiPayload: (data) => data?.data || [],
}));

vi.mock('./pixel/ui/PixelAvatar', () => ({
  default: ({ src }) => <img data-testid="pixel-avatar" src={src} alt="avatar" />,
}));

vi.mock('./pixel/layout/PixelContainer', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('./sidebar/SocialLinks', () => ({
  default: ({ links = [] }) => <div data-testid="social-links" data-count={links.length} />,
}));

vi.mock('./sidebar/Education', () => ({
  default: ({ items = [] }) => <div data-testid="education" data-count={items.length} />,
}));

vi.mock('./sidebar/TechStack', () => ({
  default: ({ items = [] }) => <div data-testid="tech-stack" data-count={items.length} />,
}));

vi.mock('./sidebar/GitHubActivity', () => ({
  default: (props) => mockGitHubActivity(props),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes configured GitHub username to GitHubActivity', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
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
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        data: [{ name: 'home' }],
      }),
    });

    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByTestId('github-activity')).toHaveAttribute('data-username', 'HandyWote');
    });
  });

  it('extracts GitHub username when github_calendar_url is a full URL', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        data: [{ name: 'home', title: 'Loaded Title', github_calendar_url: 'https://ghchart.rshah.org/HandyWote' }],
      }),
    });

    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('Loaded Title')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('github-activity')).toHaveAttribute('data-username', 'HandyWote');
    });
  });

  it('passes sidebar configured lists to child sections', async () => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes('/api/site-blocks')) {
        return {
          json: async () => ({
            data: [
              { name: 'home', github_calendar_url: 'octocat' },
              {
                name: 'sidebar',
                content: {
                  social_links: [{ label: 'GitHub', href: 'https://github.com/foo' }],
                  education: [{ school: 'Shantou University', period: '2020-2024' }],
                  tech_stack: [{ name: 'React' }, { name: 'Go' }],
                },
              },
            ],
          }),
        };
      }

      return {
        json: async () => ({
          data: [{ id: 1, filename: 'avatar-current.webp', is_current: true }],
        }),
      };
    });

    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByTestId('social-links')).toHaveAttribute('data-count', '1');
      expect(screen.getByTestId('education')).toHaveAttribute('data-count', '1');
      expect(screen.getByTestId('tech-stack')).toHaveAttribute('data-count', '2');
    });
  });

  it('uses current avatar from avatars api instead of static site block avatar field', async () => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes('/api/site-blocks')) {
        return {
          json: async () => ({
            data: [
              { name: 'home', avatar: '/legacy-avatar.jpg' },
            ],
          }),
        };
      }

      return {
        json: async () => ({
          data: [{ id: 1, filename: 'avatar-current.webp', is_current: true }],
        }),
      };
    });

    render(<Sidebar />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/avatars');
      expect(screen.getByTestId('pixel-avatar')).toHaveAttribute(
        'src',
        '/api/admin/avatars/file/avatar-current.webp',
      );
    });
  });
});
