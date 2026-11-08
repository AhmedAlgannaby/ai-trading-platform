import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // في التطوير: طلبات /api تتحول للسيرفر المحلي (npm run dev:server)
      '/api': 'http://localhost:3001',
    },
  },
});
