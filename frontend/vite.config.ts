import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api/auth': 'http://localhost:3002',
      '/api/users': 'http://localhost:3002',
      '/api/upload': 'http://localhost:3002',
      '/uploads': 'http://localhost:3002',
      '/api/demands': 'http://localhost:3001',
      '/api/orders': 'http://localhost:3001',
    },
  },
})
