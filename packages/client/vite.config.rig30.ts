import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 30: a dev client on :5212 proxying to the
// proving server on :8806 — THE TRACKED GROUND (footprints) audit
// beside busy neighbors. HMR off + watcher blinded so peer saves
// never reload an art audit mid-stage. Temporary tooling — safe to
// delete.
export default defineConfig({
  server: {
    port: 5212,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8806',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8806',
      },
      '/voice': {
        target: 'http://localhost:8806',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
