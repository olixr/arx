import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Production builds ship the game only; the studios (map editor, CMS)
// talk to the /dev API, which is disabled in production — build them
// in with STUDIO=1 when you want a full internal/admin bundle.
const withStudios = process.env.STUDIO === '1';

export default defineConfig({
  build: {
    target: 'es2022',
    // The repo-root public/ directory IS the deploy artifact: point the
    // web server's document root at <repo>/public and it serves the game.
    outDir: resolve(import.meta.dirname, '../../public'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ...(withStudios
          ? {
              editor: resolve(import.meta.dirname, 'editor.html'),
              cms: resolve(import.meta.dirname, 'cms.html'),
            }
          : {}),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
      },
      // The map editor's save/load/hot-reload API on the game server.
      '/dev': {
        target: 'http://localhost:8787',
      },
    },
  },
});
