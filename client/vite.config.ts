import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/ws':        { target: 'ws://127.0.0.1:5000', ws: true },
      '/assets':    { target: 'http://127.0.0.1:5000' },
      '/api':       { target: 'http://127.0.0.1:5000' },
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        viewer: resolve(__dirname, 'viewer.html'),
        controller: resolve(__dirname, 'controller.html'),
      },
    },
  },
});