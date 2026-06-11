import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@zxing/'))         return 'scanner'
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'charts'
          if (id.includes('@supabase/'))      return 'supabase'
          if (id.includes('lucide-react'))    return 'icons'
          if (id.includes('@capacitor/'))     return 'capacitor'
          if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor'
          if (id.includes('node_modules'))    return 'vendor'
        },
      },
    },
  },
})
