import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 7: a dev client on :5183 proxying to a
// proving server on :8800 — weapon-sets (THE SECOND GRIP) proving
// beside busy neighbors. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5183,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8800',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8800',
      },
      '/voice': {
        target: 'http://localhost:8800',
      },
    },
  },
  resolve: {
    alias: {},
  },
});
