import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 31: a dev client on :5213 proxying to the
// proving server on :8807 — THE HEARTH'S SHADOW (house cat) live
// proving beside busy neighbors. HMR off + watcher blinded so peer saves
// never reload an art audit mid-stage. Temporary tooling — safe to
// delete.
export default defineConfig({
  server: {
    port: 5213,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8807',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8807',
      },
      '/voice': {
        target: 'http://localhost:8807',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
