import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG (lane 19 — THE WORK LIVES IN THE WORLD live walk):
// client on :5271 proxying to a server on :8871, so the work-cycle
// verification pass never restarts or stage-wipes the shared
// neighbor. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5271,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8871',
        ws: true,
      },
      '/dev': {
        target: 'http://127.0.0.1:8871',
      },
      '/voice': {
        target: 'http://127.0.0.1:8871',
      },
    },
  },
  // The BUILT-CLIENT lane: `vite build && vite preview` serves one
  // bundle — the dev pipeline's thousand dialogue-def dynamic imports
  // exhaust a headless browser's connection pool and bounce the
  // session; the walk needs a stable wire. es2022 = the deploy
  // target (top-level await lives in the entry).
  build: {
    target: 'es2022',
  },
  preview: {
    port: 5272,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8871',
        ws: true,
      },
      '/dev': {
        target: 'http://127.0.0.1:8871',
      },
      '/voice': {
        target: 'http://127.0.0.1:8871',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
