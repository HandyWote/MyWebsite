import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('app shell', () => {
  it('does not load KaTeX CSS from jsDelivr in index.html', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const indexHtml = fs.readFileSync(path.resolve(currentDir, '../index.html'), 'utf8');

    expect(indexHtml).not.toContain('https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css');
  });
});
