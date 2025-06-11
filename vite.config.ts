import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],
  test: { // Vitest configuration block
    globals: true, // Allows describe, it, expect, etc. without importing
    environment: 'jsdom', // Simulate browser environment
    setupFiles: './src/setupTests.ts', // Path to your setup file
    css: true, // Process CSS for component styles if needed in tests
    reporters: ['default', 'html'], // Default CLI reporter and an HTML reporter
    outputFile: { // Configuration for the HTML reporter
      html: './html/index.html' // Output path for the HTML report
    }
  },
})