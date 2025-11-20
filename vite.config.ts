import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@pdfmanager/core': resolve(__dirname, 'packages/core/src'),
      '@pdfmanager/services': resolve(__dirname, 'packages/services/src'),
      '@pdfmanager/ui': resolve(__dirname, 'packages/ui/src'),
      '@pdfmanager/utils': resolve(__dirname, 'packages/utils/src'),
      '@pdfmanager/types': resolve(__dirname, 'packages/types/src'),
    },
  },
  build: {
    outDir: 'dist/renderer',
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