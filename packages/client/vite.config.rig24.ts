import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 24: a dev client on :5202 proxying to a
// proving server on :8799 — THE HERO'S ALCOVE character-screen
// rebuild live walk beside busy neighbors. Temporary tooling —
// safe to delete.
export default defineConfig({
  server: {
    port: 5202,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8799',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8799',
      },
      '/voice': {
        target: 'http://localhost:8799',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
