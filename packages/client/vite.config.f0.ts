import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ONE RENDER — F0 golden-frame rig. A private clone of the stage
// proving config (vite.config.stage.ts) on a FREE port (:5241 instead of
// the standing rig's :5231), proxying to the same rig-36 backend (:8814 —
// the wire protocol is untouched by the epic, so the lane is shared).
// HMR off + watcher blinded, the audit-rig law. Used only by the F0
// golden capture/compare harness (dev/goldenFrames.mjs); see
// docs/the-one-render-verify.md.
export default defineConfig({
  server: {
    port: 5241,
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
