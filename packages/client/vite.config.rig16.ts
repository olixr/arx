import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG (lane 16 — THE VALE walk): client on
// :5260 proxying to a server on :8860, so proving passes never restart
// or stage-wipe the shared :8790/:5173 neighbor. Temporary tooling —
// safe to delete.
export default defineConfig({
  server: {
    port: 5260,
    // HMR off + watcher blinded so peer saves never reload a proving
    // pass mid-walk (the rig13 lesson).
    hmr: false,
    watch: {
      ignored: ['**/*'],
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8860',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8860',
      },
      '/voice': {
        target: 'http://localhost:8860',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
