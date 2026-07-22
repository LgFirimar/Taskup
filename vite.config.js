import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Switched from the default generateSW strategy to injectManifest so we
      // can ship a hand-written service worker (src/sw.js) with 'push' and
      // 'notificationclick' listeners for real push notifications — the
      // auto-generated Workbox service worker has no hook for custom events.
      // precacheAndRoute(self.__WB_MANIFEST) inside src/sw.js still gets the
      // same offline app-shell caching as before; only the source changed.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      includeAssets: ['favicon.svg', 'icon.svg', 'icon.png'],
      manifest: {
        name: 'Taskup',
        short_name: 'Taskup',
        description: 'ניהול משימות, תזכורות, קניות ופרויקטים — הכל במקום אחד',
        lang: 'he',
        dir: 'rtl',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5f6fa',
        theme_color: '#2d6a4f',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
