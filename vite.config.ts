/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite's dev and preview servers already fall back to index.html for unknown
// paths (appType: 'spa'), so /story and deep links resolve client-side.
export default defineConfig(({ isSsrBuild }) => ({
  appType: 'spa',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  // The SSR build (npm run build) must emit dist-ssr/entry-server.js unhashed: scripts/prerender.mjs imports it by that name.
  build: isSsrBuild ? { rolldownOptions: { output: { entryFileNames: '[name].js' } } } : {},
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
