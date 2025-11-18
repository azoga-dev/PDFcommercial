import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        logWindow: 'logWindow.html',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});