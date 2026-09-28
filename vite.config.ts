import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // data/ holds the raw training datasets (~800k small files - see
  // scripts/process*.mjs). Left to Vite's defaults, the dev server's file
  // watcher and its dependency scanner (which globs **/*.html across the
  // whole root) walk every one of them, and the dev server stalls for minutes.
  server: {
    watch: { ignored: ['**/data/**'] },
  },
  optimizeDeps: {
    entries: ['index.html', 'trainer.html', 'mathinput.html', 'detect.html'],
  },
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
        orientation: 'any',
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
