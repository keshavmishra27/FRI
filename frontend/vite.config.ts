import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves at: https://keshavmishra27.github.io/FRI/
  base: '/FRI/',
  plugins: [react(), tailwindcss()],
})
