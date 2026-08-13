import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 5: a dev client on :5181 proxying to a
// proving server on :8798 — belt/quick-use proving beside four busy
// neighbors. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5181,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8798',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8798',
      },
      '/voice': {
        target: 'http://localhost:8798',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
