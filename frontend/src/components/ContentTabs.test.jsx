import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContentTabs from './ContentTabs';

function LocationEcho() {
  const location = useLocation();
  return <div data-testid="location-echo">{location.pathname}</div>;
}

describe('ContentTabs routing behavior', () => {
  it('uses current URL to decide active content', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/" element={<ContentTabs />}>
            <Route path="articles" element={<div>ARTICLE_VIEW</div>} />
            <Route path="projects" element={<div>PROJECT_VIEW</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('PROJECT_VIEW')).toBeInTheDocument();
  });

  it('navigates when clicking tab button', () => {
    render(
      <MemoryRouter initialEntries={['/articles']}>
        <Routes>
          <Route path="/" element={<>
            <ContentTabs />
            <LocationEcho />
          </>}>
            <Route path="articles" element={<div>ARTICLE_VIEW</div>} />
            <Route path="projects" element={<div>PROJECT_VIEW</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /~\/projects/i }));

    expect(screen.getByTestId('location-echo')).toHaveTextContent('/projects');
  });

  it('marks active tab for stable highlighted styling', () => {
    render(
      <MemoryRouter initialEntries={['/articles']}>
        <Routes>
          <Route path="/" element={<ContentTabs />}>
            <Route path="articles" element={<div>ARTICLE_VIEW</div>} />
            <Route path="projects" element={<div>PROJECT_VIEW</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /~\/articles/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('button', { name: /~\/projects/i })).toHaveAttribute('data-active', 'false');
  });
});
