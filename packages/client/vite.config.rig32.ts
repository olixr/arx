import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 32: a dev client on :5214 proxying to the
// proving server on :8808 — render performance audit round 6 (lighting
// v4 / grass coat / prop density / particles / tree wind) beside busy
// neighbors. HMR off + watcher blinded so peer saves never reload an
// A/B measurement mid-cycle. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5214,
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8808',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8808',
      },
      '/voice': {
        target: 'http://localhost:8808',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
