import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Next app shell', () => {
  it('uses a persistent ordinary DOM ScreenHost in the public layout', () => {
    const source = fs.readFileSync(path.join(root, 'app/(public)/layout.tsx'), 'utf8');
    expect(source).toContain('id="screen-host"');
    expect(source).toContain('data-screen-host="public"');
    expect(source).not.toContain('createPortal');
  });

  it('keeps server and browser API addresses separated', () => {
    const server = fs.readFileSync(path.join(root, 'src/api/server.ts'), 'utf8');
    const browser = fs.readFileSync(path.join(root, 'src/api/browser.ts'), 'utf8');
    expect(server).toContain("import 'server-only'");
    expect(server).toContain('BACKEND_INTERNAL_URL');
    expect(browser).toContain('endpoint must be relative');
    expect(browser).not.toContain('BACKEND_INTERNAL_URL');
  });

  it('defines permanent redirects for legacy /app routes', () => {
    const source = fs.readFileSync(path.join(root, 'next.config.ts'), 'utf8');
    expect(source).toContain("source: '/app/articles/:id'");
    expect(source).toContain("destination: '/articles/:id'");
    expect(source).toContain("source: '/app/admin/:path*'");
    expect(source).toContain('permanent: true');
  });

  it('has no Vite or React Router entry files', () => {
    expect(fs.existsSync(path.join(root, 'index.html'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'vite.config.js'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'src/main.jsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'src/App.jsx'))).toBe(false);
  });
});
