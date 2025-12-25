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
      manifest: {
        name: 'Invoice to Sheet AI',
        short_name: 'InvoiceAI',
        description: 'AI-powered Invoice to Google Sheets Scanner',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/StrokeArtInstitute_invoiceApp/',
        start_url: '/StrokeArtInstitute_invoiceApp/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
