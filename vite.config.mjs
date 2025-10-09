import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Inject environment variables at build time
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAP || ''),
    'import.meta.env.VITE_GOOGLE_MAP': JSON.stringify(process.env.VITE_GOOGLE_MAP || ''),
  },
  server: {
    port: 5173,
    host: true
  }
})
