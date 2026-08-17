import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG (lane 20 — THE DROPPED WORLD live walk): client on
// :5273 proxying to a server on :8872, so the ground-loot verification
// pass never restarts or stage-wipes a shared neighbor. Temporary
// tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5273,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8872',
        ws: true,
      },
      '/dev': {
        target: 'http://127.0.0.1:8872',
      },
      '/voice': {
        target: 'http://127.0.0.1:8872',
      },
    },
  },
  // The BUILT-CLIENT lane (lane 19's lesson): one bundle keeps a
  // headless browser's connection pool alive where the dev pipeline's
  // dialogue-def import flood bounces it.
  build: {
    target: 'es2022',
  },
  preview: {
    port: 5274,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8872',
        ws: true,
      },
      '/dev': {
        target: 'http://127.0.0.1:8872',
      },
      '/voice': {
        target: 'http://127.0.0.1:8872',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
