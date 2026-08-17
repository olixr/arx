import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 29: a dev client on :5211 proxying to the
// proving server on :8805 — the prop-rework (bell, cord, tub-wheel, stool, tally) audit beside
// busy neighbors. HMR off + watcher blinded so peer saves never
// reload an art audit mid-stage. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5211,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8805',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8805',
      },
      '/voice': {
        target: 'http://localhost:8805',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
