import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 28: a dev client on :5210 proxying to the
// proving server on :8803 — the basilisk (stone court) audit beside
// busy neighbors. HMR off + watcher blinded so peer saves never
// reload an art audit mid-stage. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5210,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8803',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8803',
      },
      '/voice': {
        target: 'http://localhost:8803',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
