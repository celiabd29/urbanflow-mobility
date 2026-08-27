import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'

// Config dédiée aux tests : uniquement le plugin React + l'alias @, sans le
// plugin PWA/Tailwind de vite.config.js (inutiles et bruyants pour les tests).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // jsdom : un DOM en mémoire pour rendre les composants React.
    environment: 'jsdom',
    // Expose describe/it/expect sans import explicite.
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Les composants testés n'importent pas de CSS.
    css: false,
  },
})
