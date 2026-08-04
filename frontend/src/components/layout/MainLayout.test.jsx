import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import MainLayout from './MainLayout';

describe('MainLayout', () => {
  it('renders the active nested route through its outlet', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="projects" element={<div>Projects route</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Projects route')).toBeInTheDocument();
  });
});
