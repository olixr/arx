import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 12: a dev client on :5220 proxying to a
// proving server on :8820 — the foliage curation audit beside busy
// neighbors. HMR off + watcher blinded so peer saves never reload an
// art audit mid-stage. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5220,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8820',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8820',
      },
      '/voice': {
        target: 'http://localhost:8820',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
