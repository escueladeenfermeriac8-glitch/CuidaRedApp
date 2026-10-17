import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',           // muestra aviso "Nueva versión disponible"
      includeAssets: [
        'favicon.svg',
        'icons/*.png',
      ],
      manifest: {
        name: 'CuidaRed',              // se sobreescribe en runtime con APP_NAME
        short_name: 'CuidaRed',
        description: 'Valoración comunitaria y familiar en el primer nivel de atención',
        theme_color: '#17375E',
        background_color: '#F5F7FA',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'es-AR',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precachea la app, los catálogos JSON y las fuentes del bundle
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        // Catálogos en caché (network-first para actualizaciones)
        runtimeCaching: [
          {
            urlPattern: /\/catalogos\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'catalogos-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,   // no activar SW en dev para facilitar debugging
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
