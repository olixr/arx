import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG (lane 17 — PINEWATCH REMADE walk): client on
// :5270 proxying to a server on :8870, so proving passes never restart
// or stage-wipe the shared :8790/:5173 neighbor. Temporary tooling —
// safe to delete.
export default defineConfig({
  server: {
    port: 5270,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8870',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8870',
      },
      '/voice': {
        target: 'http://localhost:8870',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
