import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG (lane 15 — THE WORLDS APART proving): client on
// :5245 proxying to a server on :8845, so proving passes never restart
// or stage-wipe the shared :8790/:5173 neighbor. Temporary tooling —
// safe to delete.
export default defineConfig({
  server: {
    port: 5245,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8845',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8845',
      },
      '/voice': {
        target: 'http://localhost:8845',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
