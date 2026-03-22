import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GitHubActivity from './GitHubActivity';

const mockCalendar = vi.fn(() => <div data-testid="github-calendar" />);

vi.mock('react-github-calendar', () => ({
  GitHubCalendar: (props) => mockCalendar(props),
}));

describe('GitHubActivity', () => {
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

  it('provides a link to full GitHub contributions page', () => {
    render(<GitHubActivity username="octocat" />);

    const fullLink = screen.getByRole('link', { name: '查看完整贡献图' });
    expect(fullLink).toHaveAttribute('href', 'https://github.com/octocat');
    expect(fullLink).toHaveAttribute('target', '_blank');
    expect(fullLink).toHaveAttribute('rel', 'noreferrer');
  });

  it('keeps calendar container readable with horizontal scroll', () => {
    render(<GitHubActivity username="HandyWote" />);
    expect(screen.getByTestId('github-calendar-scroll')).toHaveStyle({
      overflowX: 'auto',
    });
  });
});
