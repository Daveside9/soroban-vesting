import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Required for Stellar SDK in browser
    'process.env': {},
    global: 'globalThis',
  },
  server: {
    port: 3000,
  },
});
