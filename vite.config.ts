/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'SGEB · Sistema de Gestión de Eventos de Banquetes',
        short_name: 'SGEB',
        description:
          'Consola web de SGEB para la gestión de eventos, personal y operación de banquetes.',
        theme_color: '#2c2c2a',
        background_color: '#fafaf8',
        display: 'standalone',
        start_url: '/',
        // Production icons generated from the authoritative brand isotype
        // (src/assets/branding/logo-dark.svg) — see public/icons/.
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache only the built application shell and static assets that
        // `vite build` emits (JS/CSS/HTML/icons). No API response is ever
        // precached or runtime-cached here — see docs/FrontendArchitecture.md
        // §10 (PWA) for what this intentionally does NOT cache yet:
        // SSO responses, SGEB responses, and public/comensal responses.
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webmanifest}'],
        // All client-side React Router routes (including /auth/* and
        // /publico/*) must keep resolving through the SPA index.html
        // fallback, so direct navigation and browser refresh keep working.
        // No routes are excluded from this fallback.
        navigateFallback: 'index.html',
        // No runtimeCaching entries are configured yet: SSO, SGEB, and
        // public API requests are never intercepted by the service worker
        // and always go straight to the network.
        runtimeCaching: [],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
