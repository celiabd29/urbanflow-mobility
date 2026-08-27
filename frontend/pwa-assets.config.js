import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Génère le jeu d'icônes PWA (192, 512, maskable, apple-touch, favicon)
// à partir d'une seule source carrée. Étape 1 des fondations PWA.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/pwa-source.svg'],
})
