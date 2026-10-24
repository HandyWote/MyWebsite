import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PixelContainer from './PixelContainer';

describe('PixelContainer corner decorations', () => {
  it('does not render corner decorations when section is false', () => {
    render(<PixelContainer><div>content</div></PixelContainer>);

    expect(screen.queryByTestId('pixel-corner-tl')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pixel-corner-tr')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pixel-corner-bl')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pixel-corner-br')).not.toBeInTheDocument();
  });

  it('renders corner decorations when section is true', () => {
    render(<PixelContainer section><div>content</div></PixelContainer>);

    expect(screen.getByTestId('pixel-corner-tl')).toBeInTheDocument();
    expect(screen.getByTestId('pixel-corner-tr')).toBeInTheDocument();
    expect(screen.getByTestId('pixel-corner-bl')).toBeInTheDocument();
    expect(screen.getByTestId('pixel-corner-br')).toBeInTheDocument();
  });
});
