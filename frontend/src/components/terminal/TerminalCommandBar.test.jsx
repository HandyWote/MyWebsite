import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TerminalCommandBar from './TerminalCommandBar';

function LocationEcho() {
  const location = useLocation();
  return <div data-testid="location-echo">{location.pathname}</div>;
}

describe('TerminalCommandBar', () => {
  it('shows matching command suggestions and runs the selected suggestion', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <TerminalCommandBar cwd="~/app" commands={['cd articles/']} />
                <LocationEcho />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Terminal command'), {
      target: { value: 'art' },
    });

    expect(screen.getByRole('option', { name: 'cd articles/' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText('Terminal command'), { key: 'Enter' });

    expect(screen.getByTestId('location-echo')).toHaveTextContent('/articles');
  });

  it('completes matching commands with tab before enter', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <TerminalCommandBar cwd="~/app" commands={['cd projects/']} />
                <LocationEcho />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Terminal command'), {
      target: { value: 'proj' },
    });
    fireEvent.keyDown(screen.getByLabelText('Terminal command'), { key: 'Tab' });

    expect(screen.getByLabelText('Terminal command')).toHaveValue('cd projects/');

    fireEvent.keyDown(screen.getByLabelText('Terminal command'), { key: 'Enter' });

    expect(screen.getByTestId('location-echo')).toHaveTextContent('/projects');
  });
});
