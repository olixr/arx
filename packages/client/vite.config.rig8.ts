import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 8: a dev client on :5185 proxying to a
// proving server on :8802 — THE FAIR HOUSE FURNISHED elven decor
// audit beside busy neighbors. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5185,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8802',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8802',
      },
      '/voice': {
        target: 'http://localhost:8802',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
