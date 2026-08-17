import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 26: a dev client on :5206 proxying to the
// lane-25 proving server on :8801 — the wall-seam (band underlap)
// audit. HMR off + watcher blinded so peer saves never reload an
// audit mid-stage. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5206,
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
