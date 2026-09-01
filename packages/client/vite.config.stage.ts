import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE PAINTED STAGE proving rig: the epic worktree's client on :5231
// proxying to the standing rig-36 server (:8814, DB arx_rig_36 — the
// wire protocol is untouched by the epic, so the lane is shared).
// HMR off + watcher blinded, the audit-rig law.
export default defineConfig({
  server: {
    port: 5231,
    strictPort: true,
    hmr: false,
    watch: { ignored: ['**/*'] },
    proxy: {
      '/ws': { target: 'ws://localhost:8814', ws: true },
      '/dev': { target: 'http://localhost:8814' },
      '/voice': { target: 'http://localhost:8814' },
    },
  },
  resolve: { alias: {} },
  root: resolve(import.meta.dirname, '.'),
});
