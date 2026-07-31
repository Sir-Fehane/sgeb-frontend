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
     * `eventos` renders the real, presentation-only events feature
     * (features/events); the other three children still render the
     * shared development placeholder, not a real page.
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
          const { EventsPage } = await import('@/features/events/pages/EventsPage')
          return { Component: EventsPage }
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
  /*
   * Public SSO web auth screens (S1, the web adaptation of S3, S5, S6 —
   * docs/FrontendArchitecture.md §17). Each page renders `AuthLayout`
   * itself (no shared AppShell chrome, no route guards — auth
   * integration is out of scope for this branch, see §10.1/§18).
   */
  {
    path: '/login',
    lazy: async () => {
      const { LoginPage } = await import('@/features/auth/pages/LoginPage')
      return { Component: LoginPage }
    },
  },
  {
    path: '/verificacion-2fa',
    lazy: async () => {
      const { TwoFactorPage } = await import('@/features/auth/pages/TwoFactorPage')
      return { Component: TwoFactorPage }
    },
  },
  {
    path: '/recuperar',
    lazy: async () => {
      const { RecoveryRequestPage } =
        await import('@/features/auth/pages/RecoveryRequestPage')
      return { Component: RecoveryRequestPage }
    },
  },
  {
    path: '/recuperar/:token',
    lazy: async () => {
      const { NewPasswordPage } = await import('@/features/auth/pages/NewPasswordPage')
      return { Component: NewPasswordPage }
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
