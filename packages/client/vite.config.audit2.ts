import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE FROZEN AUDIT LANE: a dev client on :5202 proxying to the lane-9
// proving server on :8813, with HMR OFF and the file watcher blinded —
// peer sessions saving shared/content files must never reload an art
// audit mid-stage. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5202,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8813',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8813',
      },
      '/voice': {
        target: 'http://localhost:8813',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
