import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 35: a dev client on :5217 proxying to the
// proving server on :8791 — THE COMPANY YOU KEEP (companions split)
// live proving beside busy neighbors. HMR off + watcher blinded so
// peer saves never reload an audit mid-stage. Temporary tooling —
// safe to delete.
export default defineConfig({
  server: {
    port: 5217,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8791',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8791',
      },
      '/voice': {
        target: 'http://localhost:8791',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
