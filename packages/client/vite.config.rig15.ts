import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 15: a dev client on :5250 proxying to a
// proving server on :8850 — the herbalist-shelf audit (sill pots,
// physic tub, drying bundles) beside busy neighbors. HMR off + the
// watcher blinded so peer saves never reload an art audit mid-stage.
// Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5250,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8850',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8850',
      },
      '/voice': {
        target: 'http://localhost:8850',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
