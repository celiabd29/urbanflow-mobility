import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Plugin React + plugin Tailwind v4 (compile le CSS des utilitaires).
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Alias "@" -> dossier src/, pour reproduire les imports v0 (@/components, @/lib/utils).
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
