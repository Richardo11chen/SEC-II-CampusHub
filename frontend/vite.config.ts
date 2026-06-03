/// <reference types="vitest/config" />
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
      '/api/messages': 'http://localhost:3002',
      '/api/upload': 'http://localhost:3002',
      '/uploads': 'http://localhost:3002',
      '/api/reviews': 'http://localhost:3002',
      '/api/notifications': 'http://localhost:3002',
      '/api/admin': 'http://localhost:3002',
      '/api/demands': 'http://localhost:3001',
      '/api/orders': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/utils/__tests__/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/main.tsx', 'src/vite-env.d.ts', 'src/**/__tests__/**'],
    },
  },
})
