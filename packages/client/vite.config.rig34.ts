import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE SOAK LANE, lane 34: a dev client on :5216 proxying to the
// proving server on :8813 — the long-session decay audit (the
// 30-minute slide to a locked 30fps). HMR off + watcher blinded so
// peer saves never reload a soak mid-run; RESTART THIS VITE after
// every client edit or the lane serves stale modules.
// Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5216,
    hmr: false,
    watch: { ignored: ['**/*'] },
    proxy: {
      '/ws': { target: 'ws://localhost:8813', ws: true },
      '/dev': { target: 'http://localhost:8813' },
      '/voice': { target: 'http://localhost:8813' },
    },
  },
  resolve: { alias: {} },
  root: resolve(import.meta.dirname, '.'),
});
