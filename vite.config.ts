import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Абсолютные пути к HTML, чтобы Rollup точно их нашёл
        main: resolve(__dirname, 'src/index.html'),
        logWindow: resolve(__dirname, 'src/logWindow.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});