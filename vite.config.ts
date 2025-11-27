import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allow LAN access (use your IP)
    port: 5173,
    proxy: {
      // proxy API calls to backend running on your machine
      '/api': 'http://localhost:3001',
    },
  },
})
