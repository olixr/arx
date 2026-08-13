import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 4: a dev client on :5180 proxying to a
// proving server on :8797, so quest-journal proving never restarts or
// stage-wipes the shared lanes. Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5180,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8797',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8797',
      },
      '/voice': {
        target: 'http://localhost:8797',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
