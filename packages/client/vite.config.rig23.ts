import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 23: a dev client on :5200 proxying to a
// proving server on :8797 — THE WATCHFUL GROUND trigger + gate
// greeting live walk beside busy neighbors. Temporary tooling —
// safe to delete.
export default defineConfig({
  server: {
    port: 5200,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8797',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8797',
      },
      '/voice': {
        target: 'http://localhost:8797',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
