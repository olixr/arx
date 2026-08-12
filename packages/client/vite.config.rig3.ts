import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// LANE 3 (scratchpad rig): third isolated client on :5178 proxying to
// a third server on :8795 — art-audit passes beside two busy
// neighbors. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5178,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8795',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8795',
      },
      '/voice': {
        target: 'http://localhost:8795',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
