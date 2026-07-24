import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        editor: resolve(import.meta.dirname, 'editor.html'),
        cms: resolve(import.meta.dirname, 'cms.html'),
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
