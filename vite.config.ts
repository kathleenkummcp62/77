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
    strictPort: false // Allow fallback to another port if 5173 is in use
  },
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'dist']
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  },
  resolve: {
    dedupe: ['@supabase/supabase-js', 'react', 'react-dom']
  }
})