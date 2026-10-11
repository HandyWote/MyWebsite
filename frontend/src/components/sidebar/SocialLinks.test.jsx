import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SocialLinks from './SocialLinks';

describe('SocialLinks href normalization (issue #4)', () => {
  it('renders bare email href as mailto link instead of site-relative path', () => {
    render(
      <SocialLinks
        links={[{ type: 'email', label: 'Email: handy@handywote.top', href: 'handy@handywote.top' }]}
      />,
    );

    const link = screen.getByText('Email: handy@handywote.top');
    expect(link.getAttribute('href')).toBe('mailto:handy@handywote.top');
  });

  it('does not open a new browsing context for mail links', () => {
    render(
      <SocialLinks
        links={[{ type: 'email', label: 'Email: handy@handywote.top', href: 'handy@handywote.top' }]}
      />,
    );

    const link = screen.getByText('Email: handy@handywote.top');
    expect(link.getAttribute('target')).toBeNull();
  });

  it('keeps http(s) links as-is and opens them in a new tab', () => {
    render(
      <SocialLinks
        links={[{ type: 'github', label: 'Github: HandyWote', href: 'https://github.com/HandyWote' }]}
      />,
    );

    const link = screen.getByText('Github: HandyWote');
    expect(link.getAttribute('href')).toBe('https://github.com/HandyWote');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('keeps existing mailto hrefs untouched', () => {
    render(
      <SocialLinks
        links={[{ type: 'email', label: 'Email: me@example.com', href: 'mailto:me@example.com' }]}
      />,
    );

    const link = screen.getByText('Email: me@example.com');
    expect(link.getAttribute('href')).toBe('mailto:me@example.com');
  });

  it('falls back to mailto when type is email and only value is set', () => {
    render(<SocialLinks links={[{ type: 'email', value: 'me@example.com' }]} />);

    const link = screen.getByText('me@example.com');
    expect(link.getAttribute('href')).toBe('mailto:me@example.com');
  });

  it('does not treat a normal label or url without @ as email', () => {
    render(<SocialLinks links={[{ type: 'other', label: 'Blog', href: 'blog' }]} />);

    const link = screen.getByText('Blog');
    expect(link.getAttribute('href')).toBe('blog');
  });
});
