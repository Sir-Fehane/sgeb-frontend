import { createBrowserRouter } from 'react-router-dom'

/**
 * Minimal route table for the technical foundation.
 *
 * Uses React Router's own route-level `lazy` loading (rather than raw
 * `React.lazy` + a manual `<Suspense>` boundary), which is the pattern the
 * rest of the app should follow as business routes are added — see
 * docs/FrontendArchitecture.md §17 for the full planned route map. No
 * route guards exist yet because there is no auth contract to guard with.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { DesignSystemPreviewPage } =
        await import('@/app/router/pages/DesignSystemPreviewPage')
      return { Component: DesignSystemPreviewPage }
    },
  },
  {
    /**
     * Authenticated shell — no route guard yet (§10.1). Only the 4 nav
     * items with an approved top-level route in
     * docs/FrontendArchitecture.md §17 get a child route here ("Operación
     * en vivo", "Bebidas y Cubaitor", and "Pagos" do not — see the
     * comment on `NAV_ITEMS` in shared/components/layout/nav-items.ts).
     * Every child below renders the same development placeholder, not a
     * real page.
     */
    lazy: async () => {
      const { AppShellLayout } = await import('@/app/router/layouts/AppShellLayout')
      return { Component: AppShellLayout }
    },
    children: [
      {
        path: 'panel',
        lazy: async () => {
          const { AppShellPreviewPage } =
            await import('@/app/router/pages/AppShellPreviewPage')
          return { Component: AppShellPreviewPage }
        },
      },
      {
        path: 'eventos',
        lazy: async () => {
          const { AppShellPreviewPage } =
            await import('@/app/router/pages/AppShellPreviewPage')
          return { Component: AppShellPreviewPage }
        },
      },
      {
        path: 'meseros',
        lazy: async () => {
          const { AppShellPreviewPage } =
            await import('@/app/router/pages/AppShellPreviewPage')
          return { Component: AppShellPreviewPage }
        },
      },
      {
        path: 'reportes',
        lazy: async () => {
          const { AppShellPreviewPage } =
            await import('@/app/router/pages/AppShellPreviewPage')
          return { Component: AppShellPreviewPage }
        },
      },
    ],
  },
  {
    path: '*',
    lazy: async () => {
      const { NotFoundPage } = await import('@/app/router/pages/NotFoundPage')
      return { Component: NotFoundPage }
    },
  },
])
