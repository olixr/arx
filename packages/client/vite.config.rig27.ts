import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 27: a dev client on :5208 proxying to the
// proving server on :8801 — the deck-platform audit beside busy
// neighbors. HMR off + watcher blinded so peer saves never reload an
// art audit mid-stage. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5208,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8801',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8801',
      },
      '/voice': {
        target: 'http://localhost:8801',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
