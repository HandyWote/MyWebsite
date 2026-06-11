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

  it('configures BrowserRouter basename from Vite base path', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const appSource = fs.readFileSync(path.resolve(currentDir, './App.jsx'), 'utf8');

    expect(appSource).toContain('const routerBasename =');
    expect(appSource).toContain('import.meta.env.BASE_URL');
    expect(appSource).toContain('<Router basename={routerBasename}>');
  });

  it('does not hardcode avatar fallback to root path in app components', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const homeSource = fs.readFileSync(path.resolve(currentDir, './components/Home.jsx'), 'utf8');
    const sidebarSource = fs.readFileSync(path.resolve(currentDir, './components/Sidebar.jsx'), 'utf8');

    expect(homeSource).not.toContain("'/avatar.webp'");
    expect(homeSource).not.toContain('"/avatar.webp"');
    expect(sidebarSource).not.toContain("'/avatar.webp'");
    expect(sidebarSource).not.toContain('"/avatar.webp"');
  });
});
