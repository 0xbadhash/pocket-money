// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false, // Changed from true to false
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    css: true, // If true, Vitest will process CSS. Otherwise, use a stub.
  },
});
