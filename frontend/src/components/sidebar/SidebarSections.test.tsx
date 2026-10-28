import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SocialLinks from './SocialLinks';
import Education from './Education';
import TechStack from './TechStack';

describe('Sidebar sections', () => {
  it('does not fall back to hardcoded social links when sidebar config is empty', () => {
    render(<SocialLinks links={[]} />);

    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
    expect(screen.queryByText('Email')).not.toBeInTheDocument();
  });

  it('does not fall back to hardcoded education when sidebar config is empty', () => {
    render(<Education items={[]} />);

    expect(screen.queryByText(/北京大学/)).not.toBeInTheDocument();
  });

  it('renders experience points under each entry when provided', () => {
    render(
      <Education
        items={[
          {
            school: '示例科技 · 后端实习',
            period: '2024.07 - 09',
            points: ['报表接口拆独立服务，P99 320ms → 90ms', '补 Redis 缓存层'],
          },
          { school: '示例大学 · 本科', period: '2021-2025' },
        ]}
      />,
    );

    expect(screen.getByText(/──\[\s*Experience\s*\]/)).toBeInTheDocument();
    expect(
      screen.getByText('示例科技 · 后端实习 (2024.07 - 09)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('报表接口拆独立服务，P99 320ms → 90ms'),
    ).toBeInTheDocument();
    expect(screen.getByText('补 Redis 缓存层')).toBeInTheDocument();
    // 无要点的条目不应渲染要点行
    expect(screen.getByText('示例大学 · 本科 (2021-2025)')).toBeInTheDocument();
  });

  it('does not fall back to hardcoded tech stack when sidebar config is empty', () => {
    render(<TechStack items={[]} />);

    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.queryByText('Go')).not.toBeInTheDocument();
  });
});
