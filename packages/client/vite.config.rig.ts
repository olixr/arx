import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG: a second dev client on :5174 proxying to a second
// server on :8791, so proving passes never restart or stage-wipe the
// shared :8790/:5173 neighbor. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8791',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8791',
      },
      '/voice': {
        target: 'http://localhost:8791',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
