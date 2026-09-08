import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Sem offline: só o app shell (HTML/CSS/JS da interface) é instalável e cacheado.
// O conteúdo clínico nunca entra neste bundle nem no precache do service worker —
// ver ARQUITETURA.md, seção 4. globPatterns abaixo deliberadamente NÃO inclui
// src/content/**/*.json nem .webp: esses arquivos não são servidos como assets
// estáticos do cliente, só são lidos pelas funções serverless em api/.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'TPOCUS — Treinamento Prático em Ultrassom Point of Care',
        short_name: 'TPOCUS',
        description: 'Consulta rápida e execução guiada de POCUS à beira do leito.',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Só o shell: JS/CSS/HTML do build. Sem runtimeCaching de /api/* —
        // conteúdo clínico e sessão nunca são cacheados pelo service worker.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      // Em dev, `vite` serve só o cliente; as funções api/ rodam via `vercel dev`
      // (ou o servidor local de testes) em outra porta. Ajustar aqui quando o
      // fluxo de dev com Vercel CLI for definido.
    },
  },
})
