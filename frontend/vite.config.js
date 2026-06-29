import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Mirrors what nginx does in production (proxy /api to the backend, same-origin from
    // the browser's perspective) -- keeps local dev and Docker behaving identically, and
    // means api.js never needs to know or care what host/port the backend is actually on.
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
})
