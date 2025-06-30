import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    host: '0.0.0.0', // Allow connections from any IP address
    port: 5173,
    strictPort: true // Fail if port is already in use
  },
  optimizeDeps: {
    exclude: ['@supabase/supabase-js']
  },
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'dist']
  }
})