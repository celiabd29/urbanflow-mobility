import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Plugin Tailwind v4 (compile le CSS des utilitaires).
    tailwindcss(),
    // --- PWA, étape 1 : manifest + service worker (assets statiques) ---
    VitePWA({
      // Le SW se met à jour tout seul quand un nouveau build est déployé.
      registerType: 'autoUpdate',
      // generateSW : Workbox génère le service worker à partir de la config.
      strategies: 'generateSW',
      // Fichiers du dossier public/ à inclure hors du bundle JS.
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'UrbanFlow Mobility',
        short_name: 'UrbanFlow',
        description: 'Planifiez vos trajets urbains et suivez votre empreinte carbone.',
        lang: 'fr',
        theme_color: '#1D9E75',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Précache des assets statiques du build : JS, CSS, images, polices.
        // Le précache Workbox les sert depuis le cache (cache-first).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Supprime les précaches des déploiements précédents à l'activation du
        // SW, pour ne pas accumuler d'anciennes versions dans le stockage.
        cleanupOutdatedCaches: true,
        // --- Étape 2 hors ligne : cache des tuiles OpenStreetMap ---
        runtimeCaching: [
          {
            // Tuiles Leaflet : https://{a,b,c}.tile.openstreetmap.org/{z}/{x}/{y}.png
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*\.png$/i,
            // Cache-first : une tuile déjà vue est servie depuis le cache,
            // ce qui garde la carte visible hors ligne.
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                // Les tuiles changent rarement : 30 jours suffisent.
                maxAgeSeconds: 60 * 60 * 24 * 30,
                // Plafond volontairement bas : les tuiles sont des réponses
                // opaques, que le navigateur « pad » fortement dans le calcul
                // de quota. Peu d'entrées suffit à garder la carte visible hors
                // ligne sans risquer de saturer le stockage. purgeOnQuotaError
                // purge et réessaie si la limite est malgré tout atteinte.
                maxEntries: 100,
                purgeOnQuotaError: true,
              },
              // Tuiles cross-origin en no-cors : réponses opaques (statut 0) en
              // plus des 200, sinon rien n'est mis en cache.
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // SW désactivé en dev pour ne pas mettre en cache pendant `npm run dev` ;
      // la vérification se fait sur le build (déployé ou `npm run preview`).
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      // Alias "@" -> dossier src/, pour reproduire les imports v0 (@/components, @/lib/utils).
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
