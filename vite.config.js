import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  server: {
    // DRF uses OPTIONS for metadata; let it reach the API proxy.
    cors: { preflightContinue: true },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: mode === 'demo' ? { outDir: 'dist-demo' } : {
    lib: { entry: fileURLToPath(new URL('./src/index.js', import.meta.url)), formats: ['es'], fileName: 'vue3-django' },
    rollupOptions: { external: ['vue', 'vue-router', 'axios', 'qs', 'element-plus', 'vant'] },
  },
  test: { environment: 'jsdom' },
}))
