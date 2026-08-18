import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 33: a dev client on :5215 proxying to the
// proving server on :8812 — the render-flicker audit (sprite-cache
// starvation, ground holes, adaptive resolution) beside busy
// neighbors. HMR off + watcher blinded so peer saves never reload an
// A/B measurement mid-cycle; RESTART THIS VITE after every client
// edit or the lane serves stale modules. Temporary tooling — safe to
// delete.
export default defineConfig({
  server: {
    port: 5215,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': { target: 'ws://localhost:8812', ws: true },
      '/dev': { target: 'http://localhost:8812' },
      '/voice': { target: 'http://localhost:8812' },
    },
  },
  resolve: { alias: {} },
  root: resolve(import.meta.dirname, '.'),
});
