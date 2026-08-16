import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Production builds ship the game only; the studios (map editor, CMS)
// talk to the /dev API, which is disabled in production — build them
// in with STUDIO=1 when you want a full internal/admin bundle.
const withStudios = process.env.STUDIO === '1';

export default defineConfig({
  plugins: [
    {
      // THE FRONT DOOR: production nginx serves landing.html at `/`
      // and the game shell at `/play` (deploy/nginx-arx.conf). Dev
      // keeps `/` as the game so every existing rig and workflow
      // holds; this shim only teaches the dev server the `/play` and
      // `/landing` spellings so links work the same in both worlds.
      name: 'arx-entry-routes',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/play') req.url = '/index.html';
          else if (req.url === '/landing') req.url = '/landing.html';
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/play') req.url = '/index.html';
          else if (req.url === '/landing') req.url = '/landing.html';
          next();
        });
      },
    },
  ],
  build: {
    target: 'es2022',
    // The repo-root public/ directory IS the deploy artifact: point the
    // web server's document root at <repo>/public and it serves the game.
    outDir: resolve(import.meta.dirname, '../../public'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        landing: resolve(import.meta.dirname, 'landing.html'),
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
        target: 'ws://localhost:8790',
        ws: true,
      },
      // The map editor's save/load/hot-reload API on the game server.
      '/dev': {
        target: 'http://localhost:8790',
      },
      // Voice clips are served by the game server out of data/voice.
      '/voice': {
        target: 'http://localhost:8790',
      },
    },
  },
});
