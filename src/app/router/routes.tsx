import { createBrowserRouter } from 'react-router-dom'

import { RouteErrorBoundary } from '@/features/route-errors/components/RouteErrorBoundary'
import { RouteHydrateFallback } from '@/features/route-errors/components/RouteHydrateFallback'

/**
 * Minimal route table for the technical foundation.
 *
 * Uses React Router's own route-level `lazy` loading (rather than raw
 * `React.lazy` + a manual `<Suspense>` boundary), which is the pattern the
 * rest of the app should follow as business routes are added — see
 * docs/FrontendArchitecture.md §17 for the full planned route map. The
 * private authentication route boundary (`feature/private-route-guard`)
 * lives at `AppShellLayout`, not here — see that component's own doc
 * comment. `/login`/`/verificacion-2fa`/`/recuperar`/`/recuperar/:token`,
 * `/publico/mesas/:codigoQr`, and `/auth/callback` are deliberately
 * registered as siblings of the `AppShellLayout` route, not children of
 * it, so none of them is ever gated by the private guard.
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
     * Authenticated shell, guarded at `AppShellLayout` — every route below
     * requires a resolved, authenticated OIDC session before its content
     * mounts (`feature/private-route-guard`). Only the 4 nav items with an
     * approved top-level, global-sidebar route in
     * docs/FrontendArchitecture.md §17 are `status: 'available'` in
     * `NAV_ITEMS` ("Operación en vivo" and "Pagos" both now have a real
     * *event-scoped* child route here, but neither has a standalone
     * top-level destination — see the comment on `NAV_ITEMS` in
     * shared/components/layout/nav-items.ts for why that's a deliberate,
     * unrelated decision, not an oversight). `panel`, `eventos`,
     * `eventos/:id`, `eventos/:id/equipo`, `eventos/:id/pase-de-lista`,
     * `eventos/:id/montaje`, `eventos/:id/operacion-en-vivo`,
     * `eventos/:id/cierre`, `eventos/:id/pagos`, `meseros` and `reportes`
     * render the real, presentation-only dashboard/events/event-detail/
     * team-selection/attendance/montage/live-operations/closure/payments/
     * waiters/reports features (features/dashboard, features/events,
     * features/waiters, features/reports) — every child now renders a real
     * page, not the shared development placeholder.
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
        /*
         * Event Detail (feature/event-detail-ui-foundation) — the route
         * value is a positive integer SGEB event id (never a UUID; only
         * USUARIO's public identifier is a UUID). Parsed/validated inside
         * `EventDetailPage`, not here — a malformed id renders the
         * feature's own unavailable state rather than a routing error.
         * Only this one route is registered; none of its documented
         * operational children (`/editar`, `/equipo`, `/pase-de-lista`,
         * `/montaje`, `/cubaitor`, `/cierre`, `/pagos` —
         * docs/FrontendArchitecture.md §17) exist yet.
         */
        path: 'eventos/:id',
        lazy: async () => {
          const { EventDetailPage } =
            await import('@/features/events/pages/EventDetailPage')
          return { Component: EventDetailPage }
        },
      },
      {
        /*
         * Team Selection — W-05 "Seleccionar equipo"
         * (feature/event-team-selection-ui-foundation). The route value is
         * the same positive integer SGEB event id as `eventos/:id`,
         * parsed/validated inside `TeamSelectionPage`, not here. This is
         * the first of Event Detail's documented operational children
         * (docs/FrontendArchitecture.md §17) to become real; the rest
         * (`/pase-de-lista`, `/montaje`, `/cubaitor`, `/cierre`, `/pagos`)
         * remain unregistered.
         */
        path: 'eventos/:id/equipo',
        lazy: async () => {
          const { TeamSelectionPage } =
            await import('@/features/events/team-selection/pages/TeamSelectionPage')
          return { Component: TeamSelectionPage }
        },
      },
      {
        /*
         * Event Attendance — W-06 "Pase de lista"
         * (feature/event-attendance-ui-foundation). The captain's
         * OBSERVATIONAL web view only — arrival confirmation itself
         * (biometric + geofence, `POST /participaciones/{id}/
         * confirmacion-llegada`) is mobile/device-originated and never
         * called from here. Same positive integer SGEB event id as the
         * other `eventos/:id/*` routes, parsed/validated inside
         * `EventAttendancePage`, not here. `/montaje`, `/cubaitor`,
         * `/cierre`, `/pagos` remain unregistered.
         */
        path: 'eventos/:id/pase-de-lista',
        lazy: async () => {
          const { EventAttendancePage } =
            await import('@/features/events/attendance/pages/EventAttendancePage')
          return { Component: EventAttendancePage }
        },
      },
      {
        /*
         * Event Montage — W-07 "Verificar montaje + asignar mesas"
         * (feature/event-montage-ui-foundation). Presentation-only:
         * checklist approval (`PATCH /checklist-instancias/{id}/aprobar`)
         * and table assignment (`POST /participaciones/{id}/asignaciones`,
         * `DELETE /asignaciones/{id_asignacion}`) are modeled as local,
         * fixture-backed captain actions only — no network call. Same
         * positive integer SGEB event id as the other `eventos/:id/*`
         * routes, parsed/validated inside `EventMontagePage`, not here.
         * `/cubaitor`, `/cierre`, `/pagos` remain unregistered.
         */
        path: 'eventos/:id/montaje',
        lazy: async () => {
          const { EventMontagePage } =
            await import('@/features/events/montage/pages/EventMontagePage')
          return { Component: EventMontagePage }
        },
      },
      {
        /*
         * Operación en vivo — event-scoped live participant roster +
         * captain/admin participant-exit action
         * (feature/live-operations-participant-exit). Product ownership:
         * this screen owns `Participacion.estado = 'salida'` (RF-32,
         * `PATCH /participaciones/{id}/estado`), restricted to the one
         * legal transition the pinned backend's state machine allows —
         * `vinculo → salida`. No canonical slug was documented anywhere
         * (`docs/FrontendArchitecture.md` §17 never listed one, and the
         * `NAV_ITEMS` "Operación en vivo" entry was `route-pending` with no
         * `href` — see that file's own comment); `operacion-en-vivo`
         * follows this router's own kebab-case, Spanish-label-derived
         * convention exactly (same as `pase-de-lista`, `montaje`,
         * `cierre`). Reached from Event Detail's roadmap section
         * (`EventDetailRoadmapSection`), not from the global sidebar — the
         * global "Operación en vivo" `NAV_ITEMS` entry deliberately stays
         * `route-pending`, same as "Pagos" — see that file's comment. No
         * Socket.IO, no event-finalization action, no payment/montage/
         * comanda mutation lives here — REST + targeted query invalidation
         * only. Same positive integer SGEB event id as the other
         * `eventos/:id/*` routes, parsed/validated inside
         * `EventLiveOperationsPage`, not here.
         */
        path: 'eventos/:id/operacion-en-vivo',
        lazy: async () => {
          const { EventLiveOperationsPage } =
            await import('@/features/events/live-operations/pages/EventLiveOperationsPage')
          return { Component: EventLiveOperationsPage }
        },
      },
      {
        /*
         * Event Closure — "Cierre del evento"
         * (feature/event-closure-ui-foundation). Closure-readiness
         * diagnostics (`GET /eventos/{id}/cierre`) and merma reporting
         * (`GET/POST /eventos/{id}/reportes-merma`) only — no payment
         * calculation/mutation (a separate future
         * `feature/event-payments-ui-foundation`), no event-finalization
         * mutation, no W-08 (Bebidas y Cubaitor, still deferred). Same
         * positive integer SGEB event id as the other `eventos/:id/*`
         * routes, parsed/validated inside `EventClosurePage`, not here.
         * `/cubaitor`, `/bebidas`, `/pagos` remain unregistered.
         */
        path: 'eventos/:id/cierre',
        lazy: async () => {
          const { EventClosurePage } =
            await import('@/features/events/closure/pages/EventClosurePage')
          return { Component: EventClosurePage }
        },
      },
      {
        /*
         * Event Payments — "Dispersión de pagos"
         * (feature/event-payments-ui-foundation). The current v1.6
         * payment-by-payment model only — the bulk
         * `POST /eventos/{id}/pagos/aprobar` was retired in v1.5 and is
         * never called or modeled here. Calculation
         * (`POST /eventos/{id}/pagos/calcular`) and per-payment recording
         * (`PATCH /pagos/{id}/pagado`, `PATCH /pagos/{id}/fallido`) are
         * local, fixture-backed captain actions only — no network call,
         * no bank/gateway integration; the actual transfer always happens
         * manually, outside SGEB. Same positive integer SGEB event id as
         * the other `eventos/:id/*` routes, parsed/validated inside
         * `EventPaymentsPage`, not here. `/cubaitor`, `/bebidas` remain
         * unregistered.
         */
        path: 'eventos/:id/pagos',
        lazy: async () => {
          const { EventPaymentsPage } =
            await import('@/features/events/payments/pages/EventPaymentsPage')
          return { Component: EventPaymentsPage }
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
          const { ReportsPage } = await import('@/features/reports/pages/ReportsPage')
          return { Component: ReportsPage }
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
  /*
   * The anonymous public diner (comensal) experience — reached directly
   * from a table's QR code, architecturally independent of the
   * captain/admin console (docs/FrontendArchitecture.md §2.2, §12): no
   * AppShell, no AuthLayout, no SSO, no derived role. `codigoQr` is an
   * opaque route param, never displayed. Only the mesa-view route is
   * registered — `/publico/mesas/:codigoQr/calificar` (§17's "Proposed
   * Routing Structure") is intentionally NOT a separate route; the
   * rating form is embedded in this one page instead.
   */
  {
    path: '/publico/mesas/:codigoQr',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { PublicDinerPage } =
        await import('@/features/public-diner/pages/PublicDinerPage')
      return { Component: PublicDinerPage }
    },
  },
  /*
   * The OIDC provider redirects here after `GET /authorize` — outside
   * both AppShell (no authenticated shell exists to render into yet) and
   * AuthLayout (that layout is the frozen S1/S3/S5/S6 provider-screen
   * shell; reusing it here would misleadingly imply this page belongs to
   * that same frozen family — see features/oidc-client's README section).
   * Only `/auth/callback` is registered; no `/callback` alias exists.
   */
  {
    path: '/auth/callback',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { AuthCallbackPage } =
        await import('@/features/oidc-client/pages/AuthCallbackPage')
      return { Component: AuthCallbackPage }
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
