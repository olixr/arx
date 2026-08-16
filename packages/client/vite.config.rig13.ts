import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 13: a dev client on :5230 proxying to a
// proving server on :8830 — the warren-and-legion camp prop audit
// beside busy neighbors. HMR off + watcher blinded so peer saves
// never reload an art audit mid-stage. Temporary tooling — safe to
// delete.
export default defineConfig({
  server: {
    port: 5230,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8830',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8830',
      },
      '/voice': {
        target: 'http://localhost:8830',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
