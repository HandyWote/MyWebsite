import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LazyGitHubCalendar from './LazyGitHubCalendar';

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {
    this.callback([{ isIntersecting: true }]);
  }

  disconnect() {}

  unobserve() {}
}

describe('LazyGitHubCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows fallback text when calendar image fails to load', async () => {
    render(<LazyGitHubCalendar src="https://example.com/calendar.svg" alt="GitHub Contributions" />);

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    const img = screen.getByAltText('GitHub Contributions');
    fireEvent.error(img);

    expect(screen.getByText('GitHub日历加载失败')).toBeInTheDocument();
  });
});
