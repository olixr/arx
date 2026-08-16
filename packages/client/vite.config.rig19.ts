import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG (lane 19 — THE WILD TAKES SIDES live walk):
// client on :5263 proxying to a server on :8863, so the hostility
// proving pass never restarts or stage-wipes the shared neighbor.
// Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5263,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8863',
        ws: true,
      },
      '/dev': {
        target: 'http://127.0.0.1:8863',
      },
      '/voice': {
        target: 'http://127.0.0.1:8863',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
