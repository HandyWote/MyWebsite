import { describe, it, expect } from 'vitest';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from './siteBlocks';

describe('site blocks defaults', () => {
  it('does not keep legacy about block defaults', () => {
    expect(SITE_BLOCK_DEFAULTS.about).toBeUndefined();
  });

  it('returns block defaults when block is missing', () => {
    expect(getBlockContent([], 'articles_page')).toEqual(SITE_BLOCK_DEFAULTS.articles_page);
  });

  it('returns normalized object content when block exists', () => {
    const blocks = [{ name: 'projects_page', content: { github_username: 'Foo' } }];
    expect(getBlockContent(blocks, 'projects_page')).toEqual({
      ...SITE_BLOCK_DEFAULTS.projects_page,
      github_username: 'Foo',
    });
  });

  it('falls back to defaults for non-object content', () => {
    const blocks = [{ name: 'sidebar', content: 'legacy' }];
    expect(getBlockContent(blocks, 'sidebar')).toEqual(SITE_BLOCK_DEFAULTS.sidebar);
  });
});
