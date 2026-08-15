import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 11: a dev client on :5190 proxying to a
// proving server on :8808 — THE ONE RAIL dock redesign audit beside
// busy neighbors. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5190,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8808',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8808',
      },
      '/voice': {
        target: 'http://localhost:8808',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
