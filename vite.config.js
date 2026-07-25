import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/zen': {
        target: 'https://opencode.ai/zen/v1',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/zen/, ''),
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
