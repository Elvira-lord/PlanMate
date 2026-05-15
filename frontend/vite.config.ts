import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const alias = {
  '@': path.resolve(__dirname, './src'),
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
  },
})
