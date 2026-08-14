import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 6: a dev client on :5183 proxying to a
// proving server on :8799 — Second Charter zone-scale stronghold
// proving beside busy neighbors. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5183,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8799',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8799',
      },
      '/voice': {
        target: 'http://localhost:8799',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
