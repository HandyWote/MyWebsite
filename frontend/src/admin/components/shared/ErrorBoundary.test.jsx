import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import ErrorBoundary from './ErrorBoundary';

// A component that throws during render
function ThrowOnRender({ message = 'test error' }) {
  throw new Error(message);
}

// A normal component for control tests
function NormalChild() {
  return <div data-testid="child">Hello</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React's internal error boundary logging
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <NormalChild />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('catches render errors and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="boom" />
      </ErrorBoundary>
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });

  it('provides a retry button that resets the error state', () => {
    let shouldThrow = true;

    function ConditionalThrow() {
      if (shouldThrow) throw new Error('conditional boom');
      return <div data-testid="recovered">Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    // Error state is shown
    expect(screen.getByText(/conditional boom/)).toBeInTheDocument();

    // Fix the error and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry|重试/i }));

    // Should now render children
    expect(screen.getByTestId('recovered')).toHaveTextContent('Recovered');
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('logs error to console.error', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="logged error" />
      </ErrorBoundary>
    );

    // Our componentDidCatch should have logged with [ErrorBoundary] prefix and an Error object
    const calls = console.error.mock.calls;
    const boundaryCall = calls.find(
      (args) => typeof args[0] === 'string' && args[0].includes('ErrorBoundary') && args[1] instanceof Error
    );
    expect(boundaryCall).toBeDefined();
    expect(boundaryCall[1].message).toContain('logged error');
  });
});
