import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// PLAY3D — THE SECOND DOOR's dev rig. A private clone of the F0 config
// on its own FREE port (:5243), proxying to the shared rig-36 backend
// (:8814) for the day S2 connects the LiveWorld. HMR stays ON — this is
// a working rig, not an audit rig. Serves /play3d.html.
//   cd packages/client && node_modules/.bin/vite --config vite.config.play3d.ts --force
export default defineConfig({
  server: {
    port: 5243,
    strictPort: true,
    proxy: {
      '/ws': { target: 'ws://localhost:8814', ws: true },
      '/dev': { target: 'http://localhost:8814' },
      '/voice': { target: 'http://localhost:8814' },
    },
  },
  resolve: { alias: {} },
  root: resolve(import.meta.dirname, '.'),
});
