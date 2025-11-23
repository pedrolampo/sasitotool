import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './', // Important for Electron to load assets correctly
  root: 'src/renderer', // Set root to renderer folder
  build: {
    outDir: '../../dist', // Build output relative to root
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  server: {
    port: 5173,
  },
});
