import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import pkg from './package.json';

export default defineConfig({
  plugins: [vue()],
  base: './', // Important for Electron to load assets correctly
  root: 'src/renderer', // Set root to renderer folder
  envDir: process.cwd(), // Load .env from project root
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
