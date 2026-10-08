import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: /^vue3-django\/src\//,
        replacement: fileURLToPath(new URL('../../src/', import.meta.url)),
      },
      {
        find: /^vue3-django$/,
        replacement: fileURLToPath(new URL('../../src/index.js', import.meta.url)),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
    cors: { preflightContinue: true },
    fs: { allow: [fileURLToPath(new URL('../../', import.meta.url))] },
    proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } },
  },
  build: { outDir: '../../dist-dashboard', emptyOutDir: true },
})
