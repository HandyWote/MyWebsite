import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'static',
  resolve: {
    alias: {
      three: path.resolve(projectRoot, 'node_modules/three'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
