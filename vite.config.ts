import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // IMPORTANT: Replace <YOUR_REPOSITORY_NAME> with the actual name of your GitHub repository.
  // For example, if your repository URL is github.com/user/my-invoice-app, this should be '/my-invoice-app/'.
  base: '/StrokeArtInstitute_invoiceApp/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'app_icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Invoice to Sheet AI',
        short_name: 'InvoiceAI',
        description: 'AI-powered Invoice to Google Sheets Scanner',
        prefer_related_applications: false,
        id: '/StrokeArtInstitute_invoiceApp/',
        start_url: '/StrokeArtInstitute_invoiceApp/',
        scope: '/StrokeArtInstitute_invoiceApp/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        orientation: 'portrait',
        icons: [
          {
            src: '/StrokeArtInstitute_invoiceApp/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/StrokeArtInstitute_invoiceApp/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/StrokeArtInstitute_invoiceApp/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/StrokeArtInstitute_invoiceApp/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
