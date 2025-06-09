/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom', // Using happy-dom
    setupFiles: './src/test/setup.ts', // Path to global setup file
    css: true, // If your components import CSS files
  },
});
