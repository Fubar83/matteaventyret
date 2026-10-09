import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import { VitePWA } from 'vite-plugin-pwa'

/** The version shown in Settings: the commit and the day it was built - the game is cached on a device, and this says which one it has. */
function appVersion(): string {
  const day = new Date().toISOString().slice(0, 10)
  try {
    return `${execSync('git rev-parse --short HEAD').toString().trim()} · ${day}`
  } catch {
    return day
  }
}

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the game under /<repo>/ - the deploy workflow sets BASE_PATH; locally it is /.
  base: process.env.BASE_PATH ?? '/',
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  // data/ holds the raw training datasets (~800k small files - see
  // scripts/process*.mjs). Left to Vite's defaults, the dev server's file
  // watcher and its dependency scanner (which globs **/*.html across the
  // whole root) walk every one of them, and the dev server stalls for minutes.
  server: {
    watch: { ignored: ['**/data/**'] },
  },
  optimizeDeps: {
    entries: ['index.html', 'trainer.html', 'mathinput.html', 'detect.html', 'clocks.html'],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version takes over and the page reloads into it (main.tsx registers the worker).
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MatteÄventyret',
        short_name: 'MatteÄventyret',
        description: 'Gratis matteäventyr för åk 3-9, byggt på Lgr22.',
        theme_color: '#0ea5e9',
        background_color: '#f8fafc',
        display: 'fullscreen',
        orientation: 'any',
        // Relative, so the installed app opens wherever it is served from.
        start_url: '.',
        scope: '.',
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
        // The game bundle (KaTeX, tfjs and all) is over the 2 MiB default.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Storybook is published beside the game (storybook/, see deploy.yml) - inside the worker's
        // scope, so without this a visit there would be answered with the game's index.html.
        navigateFallbackDenylist: [/\/storybook(\/|$)/],
      },
    }),
  ],
})
