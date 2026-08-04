import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TerminalWelcome from './TerminalWelcome';

vi.mock('../pixel/ui/PixelAvatar', () => ({
  default: ({ src }) => <img data-testid="pixel-avatar" src={src} alt="avatar" />,
}));

vi.mock('../sidebar/SocialLinks', () => ({
  default: ({ links = [] }) => <div data-testid="social-links" data-count={links.length} />,
}));

vi.mock('../sidebar/Education', () => ({
  default: ({ items = [] }) => <div data-testid="education" data-count={items.length} />,
}));

vi.mock('../sidebar/TechStack', () => ({
  default: ({ items = [] }) => <div data-testid="tech-stack" data-count={items.length} />,
}));

vi.mock('../sidebar/GitHubActivity', () => ({
  default: ({ username }) => <div data-testid="github-activity" data-username={username} />,
}));

describe('TerminalWelcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes('/api/site-blocks')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                name: 'home',
                content: {
                  title: 'Loaded Intro',
                  subtitle: 'Loaded subtitle',
                  github_calendar_url: 'https://github.com/octocat',
                },
              },
              {
                name: 'sidebar',
                content: {
                  social_links: [{ label: 'GitHub', href: 'https://github.com/foo' }],
                  education: [{ school: 'STU', period: '2020-2024' }],
                  tech_stack: [{ name: 'React' }],
                },
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          data: [{ filename: 'avatar-current.webp', is_current: true }],
        }),
      };
    });
  });

  it('renders intro data and enters articles on double click', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TerminalWelcome />} />
          <Route path="/articles" element={<div>ARTICLE_LIST_SENTINEL</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Loaded Intro')).toBeInTheDocument();
    expect(screen.getByTestId('social-links')).toHaveAttribute('data-count', '1');
    expect(screen.getByTestId('education')).toHaveAttribute('data-count', '1');
    expect(screen.getByTestId('tech-stack')).toHaveAttribute('data-count', '1');

    await waitFor(() => {
      expect(screen.getByTestId('github-activity')).toHaveAttribute('data-username', 'octocat');
    });

    fireEvent.doubleClick(screen.getByText(/double click to enter articles/i));

    expect(screen.getByText('ARTICLE_LIST_SENTINEL')).toBeInTheDocument();
  });

  it('enters articles on mobile double tap', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TerminalWelcome />} />
          <Route path="/articles" element={<div>ARTICLE_LIST_SENTINEL</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const enterHint = await screen.findByText(/double click to enter articles/i);

    const firstTap = new Event('pointerup', { bubbles: true });
    const secondTap = new Event('pointerup', { bubbles: true });
    Object.defineProperty(firstTap, 'pointerType', { value: 'touch' });
    Object.defineProperty(secondTap, 'pointerType', { value: 'touch' });
    fireEvent(enterHint, firstTap);
    fireEvent(enterHint, secondTap);

    expect(screen.getByText('ARTICLE_LIST_SENTINEL')).toBeInTheDocument();
  });
});
