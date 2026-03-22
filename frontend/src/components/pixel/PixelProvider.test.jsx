import { describe, expect, it } from 'vitest';
import { colors } from './tokens';
import { createPixelThemeOptions } from './themeOptions';

describe('PixelProvider theme palette', () => {
  it('maps MUI semantic colors to blue-only TUI accents', () => {
    const options = createPixelThemeOptions();

    expect(options.palette.primary.main).toBe(colors.accent.blue);
    expect(options.palette.secondary.main).toBe(colors.accent.blueDim);
    expect(options.palette.error.main).toBe(colors.accent.blueBright);
  });

  it('throws a clear error when semantic color main is invalid', () => {
    expect(() => {
      createPixelThemeOptions({
        ...colors,
        accent: {
          ...colors.accent,
          blueDim: undefined,
        },
      });
    }).toThrow(/secondary\.main/);
  });

  it('can import PixelProvider module without palette crash', async () => {
    const module = await import('./PixelProvider.jsx');
    expect(module.PixelProvider).toBeTypeOf('function');
  });
});
