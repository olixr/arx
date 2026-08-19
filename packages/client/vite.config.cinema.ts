import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// THE CINEMA LANE: a dev client on :5230 proxying to a dedicated
// capture server on :8830, so reel captures never restart, stage-wipe
// or steal focus from a neighbor session's :5173/:8790 stack. HMR is
// off — a peer saving a shared file must never reload a running take.
export default defineConfig({
  server: {
    port: 5230,
    // HMR is off — a peer saving a shared file must never reload a
    // running take — but the WATCHER STAYS ON: every capture navigates
    // fresh, so an invalidated module graph is exactly what we want.
    // (The audit lanes blind the watcher; a capture lane must not, or
    // it silently tapes yesterday's renderer.)
    hmr: false,
    proxy: {
      '/ws': { target: 'ws://localhost:8830', ws: true },
      '/dev': { target: 'http://localhost:8830' },
      '/voice': { target: 'http://localhost:8830' },
    },
  },
  resolve: { alias: {} },
  root: resolve(import.meta.dirname, '.'),
});
