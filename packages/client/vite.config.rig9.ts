import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 9: a dev client on :5186 proxying to a
// proving server on :8804 — THE LONG DARK FURNISHED dungeon decor
// audit beside busy neighbors. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5186,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8804',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8804',
      },
      '/voice': {
        target: 'http://localhost:8804',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
