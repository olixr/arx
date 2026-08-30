import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 36: a dev client on :5218 proxying to the
// proving server on :8814 — render-perf round 12 (prop-rich scenes on
// weak-machine throttle). HMR off + watcher blinded so peer saves
// never reload an audit mid-stage. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5218,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8814',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8814',
      },
      '/voice': {
        target: 'http://localhost:8814',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
