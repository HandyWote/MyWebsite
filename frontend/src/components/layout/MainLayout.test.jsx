import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MainLayout from './MainLayout';

describe('MainLayout', () => {
  it('renders nested route content via Outlet', () => {
    render(
      <MemoryRouter initialEntries={['/articles/42']}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="articles/:id" element={<div>ARTICLE_DETAIL_SENTINEL</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('ARTICLE_DETAIL_SENTINEL')).toBeInTheDocument();
  });
});
