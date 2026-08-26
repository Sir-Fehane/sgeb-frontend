import { createBrowserRouter } from 'react-router-dom'

import { RouteErrorBoundary } from '@/features/route-errors/components/RouteErrorBoundary'
import { RouteHydrateFallback } from '@/features/route-errors/components/RouteHydrateFallback'

/**
 * Route table for the app shell (`feature/app-shell-hardening`).
 *
 * Uses React Router's own route-level `lazy` loading (rather than raw
 * `React.lazy` + a manual `<Suspense>` boundary), which is the pattern the
 * rest of the app should follow as business routes are added — see
 * docs/FrontendArchitecture.md §17 for the full planned route map. The
 * private authentication route boundary (`feature/private-route-guard`)
 * lives at `AppShellLayout`, not here — see that component's own doc
 * comment. `/dev/design-system`, `/publico/mesas/:codigoQr`, `/auth/callback`,
 * and `/` (`feature/pre-release-polish-and-hardening`, see `LandingPage`'s
 * own doc comment) are deliberately registered as siblings of the
 * `AppShellLayout` route, not children of it, so none of them is ever
 * gated by the private guard. The legacy, frozen `/login`/
 * `/verificacion-2fa`/`/recuperar`/`/recuperar/:token` family (pre-dating
 * the finalized OIDC/PKCE architecture) was removed on this same branch —
 * SGEB has never owned auth UI; that belongs to the separate SSO project.
 * `/` is now the public `LandingPage`, not `AppShellLayout`'s own guarded
 * `index` route as it briefly was — an anonymous visit to `/` no longer
 * invisibly redirects straight into `/authorize` with nothing rendered
 * first. `AppShellLayout` itself has no `index` child anymore; every one of
 * its children is a real, named path (`panel`, `eventos`, ...) — the
 * authenticated app's own default landing spot is `/panel`
 * (`OIDC_DEFAULT_RETURN_TO`), reached by clicking "Iniciar sesión" on the
 * landing page or by any deep link's own `returnTo`, never by visiting `/`
 * itself.
 *
 * `errorElement`/`hydrateFallbackElement` are attached directly (not via
 * each route's own `lazy()` loader) so both stay effective even if a
 * route's lazy module itself fails to load — see
 * `features/route-errors/components/RouteErrorBoundary` and
 * `RouteHydrateFallback`. Both bubble from a child route to its nearest
 * ancestor that defines one, so the single instance on `AppShellLayout`
 * covers `panel`/`eventos`/`meseros`/`reportes`/`perfil` too — no
 * per-child repetition needed, and (correctly) no AppShell chrome remains
 * once either fires: a route failure or loading gap is never rendered as
 * AppShell domain content.
 */
export const router = createBrowserRouter([
  {
    /**
     * Authenticated shell, guarded at `AppShellLayout` — every route below
     * requires a resolved, authenticated OIDC session before its content
     * mounts (`feature/private-route-guard`). Every entry in `NAV_ITEMS`
     * (shared/components/layout/nav-items.ts) is now a confirmed,
     * navigable top-level route — "Operación en vivo" and
     * "Pagos" were removed from `NAV_ITEMS` entirely on
     * `feature/app-shell-hardening` (both stay real, but only as the
     * *event-scoped* `eventos/:id/operacion-en-vivo`/`eventos/:id/pagos`
     * children below, reached from Event Detail, never from the global
     * sidebar — see that file's own comment for why). This layout has no
     * `index` child anymore — `/` is now the public `LandingPage`,
     * registered as this route's sibling below, not its child (see this
     * file's top comment and `LandingPage`'s own doc comment); the
     * authenticated app's own default destination is `/panel`
     * (`OIDC_DEFAULT_RETURN_TO`), never `/` itself. `perfil` (`/perfil`) is
     * reached only from `AccountMenu`'s "Mi perfil" entry, deliberately
     * absent from `NAV_ITEMS`/the sidebar — it's account-level, not a
     * business navigation destination. `panel`, `eventos`, `eventos/:id`,
     * `eventos/:id/equipo`, `eventos/:id/pase-de-lista`,
     * `eventos/:id/montaje`, `eventos/:id/panel-operativo`,
     * `eventos/:id/solicitudes`, `eventos/:id/operacion-en-vivo`,
     * `eventos/:id/cierre`, `eventos/:id/pagos`, `menu`, `meseros`,
     * `reportes` and `perfil` render the real dashboard/events/event-
     * detail/team-selection/attendance/montage/event-dashboard/service-
     * requests/live-operations/closure/payments/menu/waiters/reports/
     * account features — every child renders a real page, never a
     * placeholder.
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
         * Event Create (feature/event-lifecycle-management) —
         * `POST /eventos` wired for real, replacing the retired
         * `EventCreateFieldPrototypePage`. Registered as a static sibling
         * of `eventos/:id` (React Router resolves static segments before
         * dynamic params regardless of array order, but this stays ahead
         * of it for readability) so the literal path `nuevo` is never
         * parsed as an event id.
         */
        path: 'eventos/nuevo',
        lazy: async () => {
          const { EventCreatePage } =
            await import('@/features/events/pages/EventCreatePage')
          return { Component: EventCreatePage }
        },
      },
      {
        /*
         * Event Detail (feature/event-detail-ui-foundation) — the route
         * value is a positive integer SGEB event id (never a UUID; only
         * USUARIO's public identifier is a UUID). Parsed/validated inside
         * `EventDetailPage`, not here — a malformed id renders the
         * feature's own unavailable state rather than a routing error.
         * Its documented operational children (docs/FrontendArchitecture.md
         * §17) — `/equipo`, `/pase-de-lista`, `/montaje`, `/cubaitor`,
         * `/cierre`, `/pagos` — are all registered below; only `/editar`
         * does not have its own route.
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
         * parsed/validated inside `TeamSelectionPage`, not here. This was
         * the first of Event Detail's documented operational children
         * (docs/FrontendArchitecture.md §17) to become real; the rest
         * (`/pase-de-lista`, `/montaje`, `/cubaitor`, `/cierre`, `/pagos`)
         * are all registered below too.
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
         * `/cierre`, `/pagos` are all registered below too.
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
         * (feature/event-operations-live). Fully live: roster, checklist
         * approval (`PATCH /checklist-instancias/{id}/aprobar`), table
         * overview (`GET /eventos/{id}/mesas`,
         * `GET /eventos/{id}/asignaciones`), and table assignment
         * (`POST /participaciones/{id}/asignaciones`,
         * `DELETE /asignaciones/{id_asignacion}`) all call the real
         * backend. Linking a table (`PATCH /asignaciones/{id}/vincular`)
         * stays read-only here — confirmed `mesero`-role/QR-device-only,
         * see `montage/types/montage.ts`'s module comment. Same positive
         * integer SGEB event id as the other `eventos/:id/*` routes,
         * parsed/validated inside `EventMontagePage`, not here.
         * `/cubaitor`, `/cierre`, `/pagos` are all registered below too.
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
         * Event Dashboard — "Panel operativo" (feature/operations-and-
         * reports-live). The real per-event operational command-center,
         * backed by the confirmed `GET /eventos/{id}/dashboard` endpoint
         * (7 sections: resumen/asistencia/montaje/piso/barra/servicio/
         * alertas, SGEB-0004 partial-success). Distinct from both `/panel`
         * (the portfolio-level `GET /dashboard/capitan` view) and
         * `eventos/:id/operacion-en-vivo` (the narrower participant-exit
         * screen below) — no route naming collision intended, but the two
         * labels are close enough that `EventDetailRoadmapSection` orders
         * "Panel operativo" first specifically to disambiguate at a
         * glance. Same positive integer SGEB event id as the other
         * `eventos/:id/*` routes, parsed/validated inside
         * `EventDashboardPage`, not here.
         */
        path: 'eventos/:id/panel-operativo',
        lazy: async () => {
          const { EventDashboardPage } =
            await import('@/features/events/dashboard/pages/EventDashboardPage')
          return { Component: EventDashboardPage }
        },
      },
      {
        /*
         * Service Requests — "Solicitudes de mesa"
         * (feature/operations-and-reports-live). Staff-facing read +
         * resolve view over `GET /eventos/{id}/solicitudes` and
         * `PATCH /solicitudes/{id}/estado` — the anonymous diner's own
         * creation flow stays in `features/public-diner`, never here. Same
         * positive integer SGEB event id as the other `eventos/:id/*`
         * routes, parsed/validated inside `EventServiceRequestsPage`, not
         * here.
         */
        path: 'eventos/:id/solicitudes',
        lazy: async () => {
          const { EventServiceRequestsPage } =
            await import('@/features/events/service-requests/pages/EventServiceRequestsPage')
          return { Component: EventServiceRequestsPage }
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
         * (`docs/FrontendArchitecture.md` §17 never listed one at the
         * time); `operacion-en-vivo` follows this router's own kebab-case,
         * Spanish-label-derived convention exactly (same as
         * `pase-de-lista`, `montaje`, `cierre`). Reached from Event
         * Detail's roadmap section (`EventDetailRoadmapSection`), never
         * from the global sidebar — `NAV_ITEMS` has no "Operación en vivo"
         * entry at all (`feature/app-shell-hardening` removed the
         * misleading `route-pending` one — see that file's own comment).
         * No event-finalization action, no payment/montage/comanda mutation
         * lives here — REST + targeted query invalidation only, PLUS (as of
         * feature/panel-realtime-notifications) a joined `evento:{id}`
         * Socket.IO room for live `participacion:cambio` push updates
         * (`useEventRealtimeRoom`, called from `EventLiveOperationsPage`).
         * Same positive integer SGEB event id as the other `eventos/:id/*`
         * routes, parsed/validated inside `EventLiveOperationsPage`, not
         * here.
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
         * Event Cubaitor — "Barra" (W-08, `feature/cubaitor-orders-live`).
         * The event-scoped bar operation surface: live orders ("tablero de
         * barra", `GET /eventos/{id}/ordenes`), dispensing (`POST
         * /orden-detalles/{id}/dispensar`, plus a manual `PATCH
         * /dispensados/{id}/reporte` fallback for MQTT failures), and this
         * event's pin configuration (`GET/POST/PUT/DELETE
         * /eventos/{id}/config-dispensado`, `PATCH .../recarga`) —
         * referencing the GLOBAL Bebidas/Insumos/Envases/Cubaitor catalogs
         * (`/menu`) for selection, never re-implementing their CRUD. Order
         * CREATION stays out of scope: `POST /mesas/{id}/ordenes` is
         * mesero-only server-side. This was the long-documented "still
         * Proposed — not registered (W-08 deferred)" slug; now real. Same
         * positive integer SGEB event id as the other `eventos/:id/*`
         * routes, parsed/validated inside `EventCubaitorPage`, not here.
         */
        path: 'eventos/:id/cubaitor',
        lazy: async () => {
          const { EventCubaitorPage } =
            await import('@/features/events/cubaitor/pages/EventCubaitorPage')
          return { Component: EventCubaitorPage }
        },
      },
      {
        /*
         * Event Closure — "Cierre del evento"
         * (feature/event-closure-ui-foundation). Closure-readiness
         * diagnostics (`GET /eventos/{id}/cierre`), merma reporting
         * (`GET/POST /eventos/{id}/reportes-merma`), and event
         * finalization (`PATCH /eventos/{id}/estado` → `finalizado`,
         * feature/closure-event-finalization — product ownership
         * confirmed to belong here, see that branch's report). Still no
         * payment calculation/mutation (a separate future
         * `feature/event-payments-ui-foundation`), no W-08 (Bebidas y
         * Cubaitor, still deferred). Same positive integer SGEB event id
         * as the other `eventos/:id/*` routes, parsed/validated inside
         * `EventClosurePage`, not here. `/cubaitor` and `/pagos` are both
         * registered below too; there is still no separate `/bebidas`
         * route — that catalog lives at the global `/menu` route instead.
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
         * real, live captain actions against the pinned backend (this
         * comment previously said "local, fixture-backed" — stale as of
         * feature/operations-and-reports-live's audit; `paymentsApi.ts`
         * has called the real endpoints since `feature/event-payments-ui-
         * foundation` shipped). There is still no bank/gateway
         * integration — the actual transfer always happens manually,
         * outside SGEB, and this screen only records the outcome. Same
         * positive integer SGEB event id as the other `eventos/:id/*`
         * routes, parsed/validated inside `EventPaymentsPage`, not here.
         * `/cubaitor` is registered below too; there is still no separate
         * `/bebidas` route — that catalog lives at the global `/menu`
         * route instead.
         */
        path: 'eventos/:id/pagos',
        lazy: async () => {
          const { EventPaymentsPage } =
            await import('@/features/events/payments/pages/EventPaymentsPage')
          return { Component: EventPaymentsPage }
        },
      },
      {
        /*
         * Menu — the GLOBAL "Bebidas y Cubaitor" catalog
         * (`feature/cubaitor-orders-live`): Bebidas/Insumos/Envases/recetas
         * and the Cubaitor device fleet, all scoped catalog-wide, never to a
         * specific event. This is the long-documented `/menu` slug
         * (`docs/FrontendArchitecture.md` §17: "IF global scope is
         * confirmed (§9)") — confirmed for real against the pinned backend
         * on this branch (Bebida/Insumo/Envase/Cubaitor all carry no
         * `id_evento`). The event-scoped live bar operation (orders,
         * dispensing, this event's pin configuration) lives at
         * `eventos/:id/cubaitor` instead, reached from Event Detail's
         * roadmap, not from here.
         */
        path: 'menu',
        lazy: async () => {
          const { MenuPage } = await import('@/features/menu/pages/MenuPage')
          return { Component: MenuPage }
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
        /*
         * Checklists — the GLOBAL template catalog
         * (`feature/checklist-flow-alignment`): reusable `montaje`/
         * `servicio`/`cierre` checklist templates and their items, backed
         * by the real `GET/POST/PUT /checklists`, `DELETE /checklists/{id}`
         * family. Scoped catalog-wide, never to a specific event — same
         * "global catalog gets its own top-level route" reasoning as
         * `/menu`. Instantiating a template against a participation stays
         * in `features/events/montage` instead, the one screen that
         * already has a participation in context.
         */
        path: 'checklists',
        lazy: async () => {
          const { ChecklistsPage } =
            await import('@/features/checklists/pages/ChecklistsPage')
          return { Component: ChecklistsPage }
        },
      },
      {
        path: 'reportes',
        lazy: async () => {
          const { ReportsPage } = await import('@/features/reports/pages/ReportsPage')
          return { Component: ReportsPage }
        },
      },
      {
        /*
         * Usuarios (feature/admin-users-roles-audit-live) — the general
         * account directory across all three roles, backed by the real
         * `GET/PUT/PATCH /usuarios*` family (capitán+admin server-side).
         * Distinct from `meseros` above (`WaitersPage`), which stays the
         * specialized mesero-recruitment + invitation screen. `NAV_ITEMS`
         * hides this entry from a non-capitán/admin session
         * (`shared/components/layout/nav-items.ts`), but the route itself
         * is registered the same as every other AppShell child — the real
         * authorization boundary is the backend's own role middleware, not
         * this router.
         */
        path: 'usuarios',
        lazy: async () => {
          const { UsersPage } = await import('@/features/users/pages/UsersPage')
          return { Component: UsersPage }
        },
      },
      {
        /*
         * Bitácora (feature/admin-users-roles-audit-live) — the real,
         * admin-only system audit log (`GET /admin/bitacora`,
         * `middleware.rol(['admin'])`). `AuditLogPage` itself gates the
         * fetch by the session's `rol` claim (same UX-only pattern
         * `ReportsPage`'s `canViewRatings` already uses) and renders a
         * friendly "no autorizado" state for a non-admin session rather
         * than firing a request that would always fail — `NAV_ITEMS` also
         * hides the nav entry, but this route-level gate covers a direct
         * URL visit too.
         */
        path: 'bitacora',
        lazy: async () => {
          const { AuditLogPage } = await import('@/features/audit-log/pages/AuditLogPage')
          return { Component: AuditLogPage }
        },
      },
      {
        /*
         * Mi perfil (feature/app-shell-hardening) — self-service editing
         * of the four fields the pinned backend's `PUT /usuarios/me`
         * actually accepts from the subject (`ProfilePage`). Reached only
         * from `AccountMenu`'s "Mi perfil" entry, never from `NAV_ITEMS`/
         * the sidebar — see this file's own top comment.
         */
        path: 'perfil',
        lazy: async () => {
          const { ProfilePage } = await import('@/features/account/pages/ProfilePage')
          return { Component: ProfilePage }
        },
      },
    ],
  },
  /*
   * Public landing page (`feature/pre-release-polish-and-hardening`) — see
   * `LandingPage`'s own doc comment for the full rationale. Registered as
   * an unguarded top-level sibling of `AppShellLayout`, same as
   * `/dev/design-system`/`/publico/mesas/:codigoQr`/`/auth/callback` below,
   * so it never triggers the private route guard or its session bootstrap.
   */
  {
    path: '/',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { LandingPage } = await import('@/features/landing/pages/LandingPage')
      return { Component: LandingPage }
    },
  },
  /*
   * Development-only reference page demonstrating the design tokens and
   * foundation components built early in this project — NOT a business
   * screen, and NOT the production root anymore (`feature/app-shell-
   * hardening` moved it here from `/`, its previous, incorrect production
   * entry point). Registered as an unguarded top-level sibling, same as
   * `/publico/mesas/:codigoQr` and `/auth/callback` below — directly
   * reachable for developers, deliberately absent from `NAV_ITEMS`/the
   * sidebar and from any authenticated-session assumption.
   */
  {
    path: '/dev/design-system',
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    lazy: async () => {
      const { DesignSystemPreviewPage } =
        await import('@/app/router/pages/DesignSystemPreviewPage')
      return { Component: DesignSystemPreviewPage }
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
