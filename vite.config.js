import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built site works when served from a sub-path
  // (e.g. GitHub Pages at https://<user>.github.io/new-design/).
  base: './',
  plugins: [react(), tailwindcss()],
})
