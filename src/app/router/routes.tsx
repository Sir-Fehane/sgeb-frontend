import { createBrowserRouter } from 'react-router-dom'

import { RouteErrorBoundary } from '@/features/route-errors/components/RouteErrorBoundary'
import { RouteHydrateFallback } from '@/features/route-errors/components/RouteHydrateFallback'

/**
 * Minimal route table for the technical foundation.
 *
 * Uses React Router's own route-level `lazy` loading (rather than raw
 * `React.lazy` + a manual `<Suspense>` boundary), which is the pattern the
 * rest of the app should follow as business routes are added — see
 * docs/FrontendArchitecture.md §17 for the full planned route map. No
 * route guards exist yet because there is no auth contract to guard with.
 *
 * `errorElement`/`hydrateFallbackElement` are attached directly (not via
 * each route's own `lazy()` loader) so both stay effective even if a
 * route's lazy module itself fails to load — see
 * `features/route-errors/components/RouteErrorBoundary` and
 * `RouteHydrateFallback`. Both bubble from a child route to its nearest
 * ancestor that defines one, so the single instance on `AppShellLayout`
 * covers `panel`/`eventos`/`meseros`/`reportes` too — no per-child
 * repetition needed, and (correctly) no AppShell chrome remains once
 * either fires: a route failure or loading gap is never rendered as
 * AppShell domain content.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
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
     * `panel`, `eventos` and `meseros` render the real, presentation-only
     * dashboard/events/waiters features (features/dashboard,
     * features/events, features/waiters); the remaining child still
     * renders the shared development placeholder, not a real page.
     */
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { AppShellLayout } = await import('@/app/router/layouts/AppShellLayout')
      return { Component: AppShellLayout }
    },
    children: [
      {
        path: 'panel',
        lazy: async () => {
          const { CaptainDashboardPage } =
            await import('@/features/dashboard/pages/CaptainDashboardPage')
          return { Component: CaptainDashboardPage }
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
          const { WaitersPage } = await import('@/features/waiters/pages/WaitersPage')
          return { Component: WaitersPage }
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
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { LoginPage } = await import('@/features/auth/pages/LoginPage')
      return { Component: LoginPage }
    },
  },
  {
    path: '/verificacion-2fa',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { TwoFactorPage } = await import('@/features/auth/pages/TwoFactorPage')
      return { Component: TwoFactorPage }
    },
  },
  {
    path: '/recuperar',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { RecoveryRequestPage } =
        await import('@/features/auth/pages/RecoveryRequestPage')
      return { Component: RecoveryRequestPage }
    },
  },
  {
    path: '/recuperar/:token',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { NewPasswordPage } = await import('@/features/auth/pages/NewPasswordPage')
      return { Component: NewPasswordPage }
    },
  },
  {
    path: '*',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { NotFoundPage } = await import('@/features/route-errors/pages/NotFoundPage')
      return { Component: NotFoundPage }
    },
  },
])
