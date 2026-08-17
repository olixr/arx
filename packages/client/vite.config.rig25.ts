import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 25: a dev client on :5204 proxying to a
// proving server on :8801 — the terrain-renderer audit beside busy
// neighbors. HMR off + watcher blinded so peer saves never reload an
// art audit mid-stage. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5204,
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
