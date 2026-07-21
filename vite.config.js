import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the built app shell (JS/CSS/HTML) so the app opens even
      // offline or on a flaky connection. Deliberately NOT caching the
      // Cloudflare Worker (AI features) or Gmail/Google API calls — those
      // need a live network and should just fail normally when offline.
      workbox: {
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
