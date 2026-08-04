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

  it('uses /app/ as production base path in vite config', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const viteConfig = fs.readFileSync(path.resolve(currentDir, '../vite.config.js'), 'utf8');

    expect(viteConfig).toContain("base: process.env.NODE_ENV === 'production' ? '/app/' : './'");
  });

  it('does not hardcode avatar fallback to root path in app components', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const welcomeSource = fs.readFileSync(path.resolve(currentDir, './components/terminal/TerminalWelcome.jsx'), 'utf8');
    const shellSource = fs.readFileSync(path.resolve(currentDir, './components/terminal/TerminalShellLayout.jsx'), 'utf8');

    expect(welcomeSource).not.toContain("'/avatar.webp'");
    expect(welcomeSource).not.toContain('"/avatar.webp"');
    expect(shellSource).not.toContain("'/avatar.webp'");
    expect(shellSource).not.toContain('"/avatar.webp"');
  });
});
