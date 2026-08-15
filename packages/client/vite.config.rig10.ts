import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 10: a dev client on :5188 proxying to a
// proving server on :8806 — THE BANKS GET THEIR GOODS skral shore
// decor audit beside busy neighbors. Temporary tooling — safe to
// delete.
export default defineConfig({
  server: {
    port: 5188,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8806',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8806',
      },
      '/voice': {
        target: 'http://localhost:8806',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
