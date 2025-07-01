import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Disable dependency optimization during build to avoid issues
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    host: '0.0.0.0', // Allow connections from any IP address
    port: 5173,
    strictPort: false, // Allow fallback to another port if 5173 is in use
  },
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'dist'],
    deps: {
      // Disable dependency optimization for tests
      optimizer: {
        web: {
          enabled: false
        }
      }
    }
  },
  optimizeDeps: {
    // Disable dependency optimization during dev to avoid cache issues
    disabled: process.env.NODE_ENV === 'test',
    include: ['@supabase/supabase-js']
  },
  resolve: {
    dedupe: ['@supabase/supabase-js', 'react', 'react-dom']
  }
})