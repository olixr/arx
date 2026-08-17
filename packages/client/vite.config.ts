import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Production builds ship the game only; the studios (map editor, CMS)
// talk to the /dev API, which is disabled in production — build them
// in with STUDIO=1 when you want a full internal/admin bundle.
const withStudios = process.env.STUDIO === '1';

export default defineConfig({
  plugins: [
    {
      // THE FRONT DOOR: the landing page is the default at `/` and the
      // game shell answers at `/play`, in dev exactly as production
      // nginx serves it (deploy/nginx-arx.conf) — Forge strips
      // extensions, so both spellings are extensionless. Only the BARE
      // `/` rewrites: any query string (`/?fx`, `/?det=1`, the lab
      // levers) still reaches the game shell, so every dev rig holds.
      name: 'arx-entry-routes',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          // Bare `/` mirrors prod's `location = /` (the landing); any
          // query on `/` keeps the game shell so the dev rigs' levers
          // (?fx, ?det…) hold.
          if (req.url === '/') req.url = '/landing.html';
          else if (req.url === '/play') req.url = '/index.html';
          else if (req.url === '/landing') req.url = '/landing.html';
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          // Bare `/` mirrors prod's `location = /` (the landing); any
          // query on `/` keeps the game shell so the dev rigs' levers
          // (?fx, ?det…) hold.
          if (req.url === '/') req.url = '/landing.html';
          else if (req.url === '/play') req.url = '/index.html';
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
