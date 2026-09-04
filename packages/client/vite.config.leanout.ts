import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE LEAN COMES OUT — golden-frame rig for the epic/lean-out branch. A
// private clone of the F0 golden rig (vite.config.f0.ts, :5241 — which the
// UNTOUCHED main checkout keeps as the b4c00f2e baseline) on its own FREE
// port (:5242), proxying to the same shared rig-36 backend (:8814). HMR off
// + watcher blinded, the audit-rig law: restart with --force after every
// edit. Used by dev/goldenFrames.mjs (BACKEND=stage|canvas) to prove every
// lean-out band byte-identical at q=0 on BOTH backends.
export default defineConfig({
  server: {
    port: 5242,
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
