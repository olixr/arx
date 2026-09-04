import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE SECOND RIG — a clone of the F0 golden rig (vite.config.f0.ts, :5241)
// on its own port (:5242), proxying to the same shared rig-36 backend
// (:8814). Serve a CANDIDATE checkout here while :5241 serves the baseline,
// so dev/goldenFrames.mjs `ab` mode (BASE_ORIGIN=:5241 ORIGIN=:5242) can
// shoot both within seconds of each other — the render-change gate that is
// immune to the shared world drifting under a committed golden. HMR off +
// watcher blinded, the audit-rig law: restart with --force after every edit.
// (Born as the epic/lean-out rig, 2026-09-04, and kept as the generic
// candidate rig.)
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
