import { describe, it, expect } from 'vitest';

describe('SocialIcons Component', () => {
  it('should have SocialIcons module exports', async () => {
    // Test that the module can be imported with named exports
    const module = await import('../utils/iconMap');
    expect(module.iconMap).toBeDefined();
  });
});
