import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG (lane 18 — THE FANG FINDS ITS VOICE curation):
// client on :5262 proxying to a server on :8862, so the pet-arts FX
// curation pass never restarts or stage-wipes the shared neighbor.
// Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5262,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8862',
        ws: true,
      },
      '/dev': {
        target: 'http://127.0.0.1:8862',
      },
      '/voice': {
        target: 'http://127.0.0.1:8862',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
