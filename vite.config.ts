import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // IMPORTANT: Replace <YOUR_REPOSITORY_NAME> with the actual name of your GitHub repository.
  // For example, if your repository URL is github.com/user/my-invoice-app, this should be '/my-invoice-app/'.
  base: '/<StrokeArtInstitute_invoiceApp>/',
  plugins: [react()],
})
