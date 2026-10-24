import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import GitHubActivity from './GitHubActivity';

const mockCalendar = vi.fn(() => <div data-testid="github-calendar" />);

vi.mock('react-github-calendar', () => ({
  GitHubCalendar: (props) => mockCalendar(props),
}));

describe('GitHubActivity', () => {
  it('uses a stable placeholder for server rendering', () => {
    mockCalendar.mockClear();

    const html = renderToString(<GitHubActivity username="octocat" compact={false} />);

    expect(html).toContain('github-calendar-placeholder');
    expect(mockCalendar).not.toHaveBeenCalled();
  });

  it('renders compact calendar settings for sidebar', () => {
    render(<GitHubActivity username="octocat" />);

    const props = mockCalendar.mock.calls.at(-1)?.[0];
    expect(props.username).toBe('octocat');
    expect(props.blockSize).toBe(10);
    expect(props.blockMargin).toBe(2);
    expect(props.showWeekdayLabels).toBe(false);
    expect(props.showMonthLabels).toBe(false);
    expect(props.showColorLegend).toBe(false);
    expect(props.showTotalCount).toBe(false);
  });

  it('trims contribution data to recent weeks for compact display', () => {
    render(<GitHubActivity username="HandyWote" />);

    const props = mockCalendar.mock.calls.at(-1)?.[0];
    const transformData = props.transformData;
    const input = Array.from({ length: 365 }, (_, index) => ({
      date: `2025-01-${String((index % 28) + 1).padStart(2, '0')}`,
      count: index,
      level: index % 5,
    }));

    const output = transformData(input);
    expect(output).toHaveLength(18 * 7);
    expect(output[0]).toEqual(input[input.length - 18 * 7]);
    expect(output[output.length - 1]).toEqual(input[input.length - 1]);
  });

  it('uses the full-year client calendar on the home page', () => {
    render(<GitHubActivity username="octocat" compact={false} />);

    const props = mockCalendar.mock.calls.at(-1)?.[0];
    const input = Array.from({ length: 400 }, (_, index) => ({
      date: `day-${index}`,
      count: index,
      level: index % 5,
    }));
    expect(props.transformData(input)).toEqual(input.slice(-(53 * 7)));
    expect(props.style.minWidth).toBe('720px');
    expect(screen.getByTestId('github-calendar-scroll')).toHaveStyle({ overflowX: 'hidden' });
  });

  it('does not render legacy full-link footer in compact sidebar mode', () => {
    render(<GitHubActivity username="octocat" />);
    expect(screen.queryByRole('link', { name: '查看完整贡献图' })).not.toBeInTheDocument();
  });

  it('keeps calendar container readable with horizontal scroll', () => {
    render(<GitHubActivity username="HandyWote" />);
    expect(screen.getByTestId('github-calendar-scroll')).toHaveStyle({
      overflowX: 'auto',
    });
  });
});
