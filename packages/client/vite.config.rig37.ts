import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE ISOLATED RIG, lane 37: a dev client on :5300 proxying to the
// proving server on :8814 — particles v6 in-world proof (the ?fx lever
// casting the composed library). HMR off so a peer's save never reloads
// an audit mid-stage; the watcher stays AWAKE so every fresh page load
// (each probe run) gets the live transforms of just-saved plan and
// breath files (THE MASTERED HAND Ph4: a blind watcher served stale
// modules to nine voice agents). Temporary tooling — safe to delete.
export default defineConfig({
  server: {
    port: 5300,
    hmr: false,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8814',
        ws: true,
      },
      '/dev': {
        target: 'http://localhost:8814',
      },
      '/voice': {
        target: 'http://localhost:8814',
      },
    },
  },
  resolve: {
    alias: {},
  },
  root: resolve(import.meta.dirname, '.'),
});
