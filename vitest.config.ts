import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify('http://localhost:54321'),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*_test.ts'],
  },
})
