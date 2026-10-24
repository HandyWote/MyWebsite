import type { CSSProperties } from 'react';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Activity } from 'react-github-calendar';
import GitHubActivity from './GitHubActivity';

/**
 * 组件传给 GitHubCalendar 的 props 契约（测试只关心这几个字段，
 * 断言的是「侧边栏拿到紧凑参数、首页拿到全年参数」这个行为）。
 */
type CalendarProps = {
  username: string;
  blockSize: number;
  blockMargin: number;
  showWeekdayLabels: boolean;
  showMonthLabels: boolean;
  showColorLegend: boolean;
  showTotalCount: boolean;
  style: CSSProperties;
  transformData: (data: Activity[]) => Activity[];
};

const mockCalendar = vi.fn((_props: CalendarProps) => <div data-testid="github-calendar" />);

vi.mock('react-github-calendar', () => ({
  GitHubCalendar: (props: CalendarProps) => mockCalendar(props),
}));

/** 取最近一次渲染时组件传下来的 props。 */
const lastCalendarProps = (): CalendarProps => {
  const call = mockCalendar.mock.calls.at(-1);
  if (!call) throw new Error('GitHubCalendar was not rendered');
  return call[0];
};

const makeActivities = (length: number): Activity[] =>
  Array.from({ length }, (_, index) => ({
    date: `day-${index}`,
    count: index,
    level: (index % 5) as Activity['level'],
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

    const props = lastCalendarProps();
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

    const transformData = lastCalendarProps().transformData;
    const input = makeActivities(365);

    const output = transformData(input);
    expect(output).toHaveLength(18 * 7);
    expect(output[0]).toEqual(input[input.length - 18 * 7]);
    expect(output[output.length - 1]).toEqual(input[input.length - 1]);
  });

  it('uses the full-year client calendar on the home page', () => {
    render(<GitHubActivity username="octocat" compact={false} />);

    const props = lastCalendarProps();
    const input = makeActivities(400);
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
