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
    path: '*',
    lazy: async () => {
      const { NotFoundPage } = await import('@/app/router/pages/NotFoundPage')
      return { Component: NotFoundPage }
    },
  },
])
