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

  it('does not fall back to hardcoded tech stack when sidebar config is empty', () => {
    render(<TechStack items={[]} />);

    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.queryByText('Go')).not.toBeInTheDocument();
  });
});
