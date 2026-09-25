import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MatteÄventyret',
        short_name: 'MatteÄventyret',
        description: 'Gratis matteäventyr för åk 3-9, byggt på Lgr22.',
        theme_color: '#0ea5e9',
        background_color: '#f8fafc',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything (including the digit-recognizer model, once added) is
        // precached so the game works fully offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,json,bin}'],
      },
    }),
  ],
})
