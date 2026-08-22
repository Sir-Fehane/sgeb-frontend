import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '@/app/router/routes'
import { beginAuthorization } from '@/features/oidc-client/protocol/authorizationRequest'
import * as bootstrapModule from '@/features/oidc-client/protocol/bootstrap'
import type { EventoApiRecord } from '@/features/events/services/eventsApi'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import type { PublicRequestConfig } from '@/shared/api/publicClient'
import { requestPublic } from '@/shared/api/publicClient'
import { SgebApplicationError } from '@/shared/api/sgebApiError'
import { requestSgeb, type SgebRequestConfig } from '@/shared/api/sgebClient'
import type { ApiEnvelope } from '@/shared/types/api'

/**
 * `/eventos` and `/eventos/:id` both read through TanStack Query + the
 * shared SGEB transport (`feature/events-live-integration`,
 * `feature/event-detail-live-integration`) — `requestSgeb` is mocked here,
 * file-wide, so every `renderAt` call site gets deterministic data instead
 * of an unmocked real network call. `event-detail`-specific behavior
 * (loading/error/not-found/mapping) has its own focused coverage in
 * `EventDetailPage.test.tsx`; this file only needs enough of a fixed
 * fixture set to keep its own AppShell/routing assertions meaningful.
 */
vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

/**
 * `/publico/mesas/:codigoQr` reads through the separate anonymous
 * transport (`feature/public-diner-live`) — mocked here for the same
 * reason as `requestSgeb` above, so this file's public-diner routing
 * assertions don't depend on an unmocked real network call.
 * Public-diner-specific behavior (loading/error/mutations) has its own
 * focused coverage in `PublicDinerPage.test.tsx`.
 */
vi.mock('@/shared/api/publicClient', () => ({
  requestPublic: vi.fn(),
}))

const DETAIL_RECORD_1001: EventoApiRecord = {
  id_evento: 1001,
  id_salon: 1,
  capitan: {
    uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombre: 'Capitán',
    apellido_paterno: 'Prueba',
    apellido_materno: null,
    correo: 'capitan.prueba@example.com',
  },
  titulo: 'Evento de demostración — boda',
  tipo: 'social',
  fecha: '2026-09-12',
  hora_presentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: null,
  cupo_meseros: 12,
  num_mesas: 20,
  tarifa_por_mesero: 450,
  radio_geocerca_m: 150,
  estado: 'publicado',
  creado_en: '2026-07-01T09:00:00',
}

const DETAIL_RECORD_3001: EventoApiRecord = {
  ...DETAIL_RECORD_1001,
  id_evento: 3001,
  titulo: 'Evento de demostración — aniversario finalizado',
  estado: 'finalizado',
}

/**
 * URL-aware default: `/eventos` (list) resolves empty (no test in this
 * file asserts on list content beyond its header); `/eventos/1001` and
 * `/eventos/3001` resolve to their matching detail record (the two ids
 * this file's route/AppShell assertions actually navigate to); any other
 * `/eventos/:id` — e.g. `999999` — resolves not-found (`SGEB-3001`),
 * matching the pinned backend's real behavior for an unknown id.
 *
 * `/eventos/1001/participaciones` and `/eventos/3001/participaciones`
 * (`feature/team-selection-live-integration`) resolve to an empty roster —
 * this file's Team Selection assertions only need the page to reach its
 * populated (non-error, non-loading) state, not any specific participant.
 *
 * `/eventos/{1001,3001}/cierre` and `/eventos/{1001,3001}/reportes-merma`
 * (`feature/closure-live-integration`) resolve to a not-yet-ready
 * diagnostic and an empty report list, respectively — this file's Closure
 * assertions only need the page to reach its populated state, same
 * reasoning as Team Selection above.
 *
 * `/eventos/{1001,3001}/pagos` (`feature/payments-live-integration`)
 * resolves to an empty payments list — same reasoning again.
 *
 * `/eventos/{1001,3001}/mesas` (`feature/event-lifecycle-management`)
 * resolves to an empty mesas list — same reasoning again. `/salones`
 * resolves to one active salón, so `/eventos/nuevo`
 * (`EventCreatePage`) reaches its real, populated form rather than its
 * own error state.
 *
 * `/eventos/{1001,3001}/dashboard` (`feature/operations-and-reports-live`)
 * resolves to a full, non-partial (`SGEB-0000`) dashboard with every
 * section present but zero-valued — this file's Event Dashboard
 * assertions only need the page to reach its populated state, same
 * reasoning as Team Selection above. `/eventos/{1001,3001}/solicitudes`
 * resolves to an empty list, same reasoning again.
 *
 * `/dashboard/capitan` (`feature/panel-live-consolidation`) resolves to a
 * genuinely empty-but-successful portfolio (every real field present, all
 * zero/empty) — this file's `/panel` assertions only need
 * `CaptainDashboardPage` to reach its populated, non-loading, non-error
 * state so its real "Próximos eventos" section heading renders as the
 * private-content marker; no test in this file asserts on specific
 * dashboard event content.
 */
function configureDefaultRequestSgebMock() {
  vi.mocked(requestSgeb).mockImplementation(
    (config: SgebRequestConfig): Promise<ApiEnvelope<unknown>> => {
      if (config.url === '/eventos') {
        return Promise.resolve({
          result: { code: 'SGEB-0002', message: 'Sin resultados.' },
          data: [],
        })
      }
      if (config.url === '/eventos/1001') {
        return Promise.resolve({
          result: { code: 'SGEB-0000', message: 'ok' },
          data: DETAIL_RECORD_1001,
        })
      }
      if (config.url === '/eventos/3001') {
        return Promise.resolve({
          result: { code: 'SGEB-0000', message: 'ok' },
          data: DETAIL_RECORD_3001,
        })
      }
      if (
        config.url === '/eventos/1001/participaciones' ||
        config.url === '/eventos/3001/participaciones'
      ) {
        return Promise.resolve({
          result: { code: 'SGEB-0002', message: 'Sin resultados.' },
          data: [],
        })
      }
      if (
        config.url === '/eventos/1001/cierre' ||
        config.url === '/eventos/3001/cierre'
      ) {
        return Promise.resolve({
          result: { code: 'SGEB-0000', message: 'ok' },
          data: {
            evento_finalizado: false,
            participaciones_total: 0,
            participaciones_sin_salida: 0,
            meseros_sin_clabe_vigente: 0,
            listo: false,
          },
        })
      }
      if (
        config.url === '/eventos/1001/reportes-merma' ||
        config.url === '/eventos/3001/reportes-merma'
      ) {
        return Promise.resolve({
          result: { code: 'SGEB-0002', message: 'Sin resultados.' },
          data: { reportes: [], costo_total: 0, piezas_sin_costear: 0 },
        })
      }
      if (config.url === '/eventos/1001/pagos' || config.url === '/eventos/3001/pagos') {
        return Promise.resolve({
          result: { code: 'SGEB-0002', message: 'Sin resultados.' },
          data: [],
        })
      }
      if (config.url === '/eventos/1001/mesas' || config.url === '/eventos/3001/mesas') {
        return Promise.resolve({
          result: { code: 'SGEB-0002', message: 'Sin resultados.' },
          data: [],
        })
      }
      if (
        config.url === '/eventos/1001/dashboard' ||
        config.url === '/eventos/3001/dashboard'
      ) {
        return Promise.resolve({
          result: { code: 'SGEB-0000', message: 'ok' },
          data: {
            id_evento: config.url === '/eventos/1001/dashboard' ? 1001 : 3001,
            titulo:
              config.url === '/eventos/1001/dashboard'
                ? DETAIL_RECORD_1001.titulo
                : DETAIL_RECORD_3001.titulo,
            estado:
              config.url === '/eventos/1001/dashboard'
                ? DETAIL_RECORD_1001.estado
                : DETAIL_RECORD_3001.estado,
            fecha: DETAIL_RECORD_1001.fecha,
            salon: 'Salón de prueba',
            resumen: {
              cupo_meseros: 0,
              inscritos: 0,
              disponibles: 0,
              mesas: 0,
              tarifa_por_mesero: 0,
            },
            asistencia: { por_estado: {}, llegadas_fallidas: 0 },
            montaje: {
              participaciones: 0,
              checklist_aprobado: 0,
              instancias_abiertas: 0,
            },
            piso: { mesas_por_estado: {}, asignaciones_vinculadas: 0 },
            barra: {
              pendientes: 0,
              en_preparacion: 0,
              dispensando: 0,
              pausadas_por_insumo: 0,
              entregadas: 0,
              canceladas: 0,
              dispensados_por_estado: {},
            },
            servicio: {
              solicitudes_pendientes: 0,
              calificaciones: 0,
              promedio_calificacion: null,
              calificaciones_bajas: 0,
            },
            alertas: {
              alertas: [],
              total: 0,
              ordenes_pausadas: 0,
              severidad_maxima: null,
            },
          },
        })
      }
      if (
        config.url === '/eventos/1001/solicitudes' ||
        config.url === '/eventos/3001/solicitudes'
      ) {
        return Promise.resolve({
          result: { code: 'SGEB-0002', message: 'Sin resultados.' },
          data: [],
        })
      }
      if (config.url === '/dashboard/capitan') {
        return Promise.resolve({
          result: { code: 'SGEB-0000', message: 'ok' },
          data: {
            en_curso: [],
            proximos: [],
            borradores: 0,
            por_cerrar: [],
            totales: { en_curso: 0, proximos: 0, por_cerrar: 0 },
          },
        })
      }
      if (config.url === '/checklists') {
        return Promise.resolve({
          result: { code: 'SGEB-0002', message: 'Sin resultados.' },
          data: [],
        })
      }
      if (config.url === '/salones') {
        return Promise.resolve({
          result: { code: 'SGEB-0000', message: 'ok' },
          data: [
            {
              id_salon: 1,
              nombre: 'Salón Roble',
              calle: 'Calle 1',
              cp: '00000',
              colonia: 'Centro',
              ciudad: 'CDMX',
              estado: 'CDMX',
              latitud: 19.4,
              longitud: -99.1,
              capacidad_max_mesas: 40,
              capacidad_personas: 200,
              activo: true,
            },
          ],
        })
      }
      return Promise.reject(
        new SgebApplicationError(404, {
          code: 'SGEB-3001',
          message: 'No encontramos la información solicitada.',
        }),
      )
    },
  )
}

const PUBLIC_MESA_CODIGO_QR = 'a1b2c3d4-e5f6-4a1b-8c2d-000000000099'

/**
 * `GET /publico/mesas/{codigo_qr}` for the one QR every public-diner test
 * in this file navigates to — this file only needs the page to reach its
 * populated, non-loading state so its real content/no-chrome assertions
 * are meaningful; the mesa/rating data itself has no bearing on routing.
 * Any other `codigo_qr` resolves not-found (`SGEB-3003`), matching the
 * pinned backend's real behavior for an unknown QR.
 */
function configureDefaultRequestPublicMock() {
  vi.mocked(requestPublic).mockImplementation(
    (config: PublicRequestConfig): Promise<ApiEnvelope<unknown>> => {
      if (
        config.method === 'GET' &&
        config.url === `/publico/mesas/${PUBLIC_MESA_CODIGO_QR}`
      ) {
        return Promise.resolve({
          result: { code: 'SGEB-0000', message: 'ok' },
          data: {
            id_mesa: 12,
            etiqueta: 'Mesa 12',
            evento: {
              id_evento: 1001,
              titulo: 'Evento de demostración',
              estado: 'en_curso',
            },
          },
        })
      }
      return Promise.reject(
        new SgebApplicationError(404, {
          code: 'SGEB-3003',
          message: 'El código QR escaneado no corresponde a ninguna mesa activa.',
        }),
      )
    },
  )
}

/**
 * Hoisted, whole-module mock — deliberately not a per-test `vi.spyOn` — so
 * the REAL `beginAuthorization` (and therefore the real `getOidcConfig()`,
 * which requires `VITE_OIDC_*` env vars this test environment intentionally
 * never provides — see `.env.test`'s own comment on why OIDC config is not
 * duplicated there) can never execute. This matters specifically here
 * because `AppShellLayout` is loaded through React Router's `lazy()` — a
 * dynamic `import()` resolved at navigation time, not at this file's static
 * top — so a per-test `vi.spyOn` risks a window where the real
 * implementation is what a private route's guard effect actually calls.
 * `vi.mock` is hoisted above every import in this file and intercepts
 * module resolution itself, so every consumer — including one reached only
 * through a later dynamic import — receives the mock unconditionally.
 */
vi.mock('@/features/oidc-client/protocol/authorizationRequest', () => ({
  beginAuthorization: vi.fn(),
}))

const mockedBeginAuthorization = vi.mocked(beginAuthorization)

const FIXTURE_USER = { sub: 'uuid-test-user', rol: 'capitan' as const }

function authenticate() {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: FIXTURE_USER,
  })
}

/**
 * Every existing describe block in this file renders a private
 * (`AppShellLayout`) route and asserts on its real content, so an
 * authenticated session is seeded by default here rather than at each of
 * the many call sites below — the dedicated "private route boundary"
 * describe block further down overrides this per-test to exercise the
 * guard itself (idle/authenticating/anonymous/error).
 */
beforeEach(() => {
  useOidcSessionStore.getState().reset()
  vi.restoreAllMocks()
  mockedBeginAuthorization.mockReset()
  configureDefaultRequestSgebMock()
  configureDefaultRequestPublicMock()
  authenticate()
})

/**
 * A fresh `QueryClient` per call, with retries disabled — this file
 * exercises the router directly (not `App.tsx`, so no `AppProviders`),
 * and `/eventos` now reads through TanStack Query
 * (`feature/events-live-integration`). Every existing `renderAt` call
 * site needs a working `QueryClientProvider` in the tree even though most
 * never touch it, and disabling retries keeps an unmocked, real network
 * failure (there is no `requestSgeb` mock in this file) from retrying and
 * leaking a pending timer past the end of its test. `wrapper` (not a
 * one-off `render` call) so `rerender(<RouterProvider .../>)` below stays
 * wrapped in the same provider instance instead of losing it.
 */
function TestQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

async function renderAt(path: string) {
  await router.navigate(path)
  return render(<RouterProvider router={router} />, { wrapper: TestQueryProvider })
}

describe('legacy SGEB auth routes are no longer registered (feature/app-shell-hardening)', () => {
  it.each(['/login', '/verificacion-2fa', '/recuperar', '/recuperar/un-token-de-prueba'])(
    '%s falls through to the not-found page, not a redirect',
    async (path) => {
      await renderAt(path)

      expect(
        screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
      ).toBeInTheDocument()
      expect(router.state.location.pathname).toBe(path)
    },
  )
})

describe('/ redirects into the authenticated shell (feature/app-shell-hardening)', () => {
  it('an authenticated session at / lands on /panel, not the design-system preview', async () => {
    await renderAt('/')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/panel')
    })
    expect(
      await screen.findByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Próximos eventos')).toBeInTheDocument()
    expect(
      screen.queryByText('SGEB frontend foundation is running'),
    ).not.toBeInTheDocument()
  })

  it('an anonymous session at / never renders the design-system preview and starts authorization exactly once', async () => {
    useOidcSessionStore.getState().setAnonymous()
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')

    await renderAt('/')

    await waitFor(() => {
      expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    })
    expect(mockedBeginAuthorization).toHaveBeenCalledWith({ returnTo: '/' })
    expect(
      screen.queryByText('SGEB frontend foundation is running'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
  })
})

describe('/dev/design-system renders the preview directly, unguarded (feature/app-shell-hardening)', () => {
  it('renders the design-system preview with no AppShell chrome', async () => {
    await renderAt('/dev/design-system')

    expect(screen.getByText('SGEB frontend foundation is running')).toBeInTheDocument()
    // No AppShell chrome — Topbar's `AccountMenu`/sidebar nav are absent
    // (the page's own content `<header>` is unrelated to this).
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Cuenta/ })).not.toBeInTheDocument()
  })

  it('does not invoke the private OIDC bootstrap', async () => {
    useOidcSessionStore.getState().reset()
    const bootstrapSpy = vi.spyOn(bootstrapModule, 'bootstrapSession')

    await renderAt('/dev/design-system')

    expect(bootstrapSpy).not.toHaveBeenCalled()
    expect(useOidcSessionStore.getState().session.status).toBe('idle')
  })
})

describe('existing routes remain available', () => {
  it('still renders the AppShell (sidebar nav) for /panel', async () => {
    await renderAt('/panel')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
  })

  it('/reportes remains available', async () => {
    await renderAt('/reportes')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('/perfil renders inside AppShell (feature/app-shell-hardening)', async () => {
    await renderAt('/perfil')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })
})

describe('an unknown path renders the not-found page', () => {
  it('renders exactly one clear heading explaining the page was not found', async () => {
    await renderAt('/una-ruta-que-no-existe')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('provides a real recovery action to /panel', async () => {
    await renderAt('/una-ruta-que-no-existe')

    expect(screen.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute(
      'href',
      '/panel',
    )
  })

  it('does not render /login and does not redirect there', async () => {
    await renderAt('/una-ruta-que-no-existe')

    expect(
      screen.queryByRole('heading', { level: 1, name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument()
    expect(window.location.pathname).not.toBe('/login')
  })

  it('does not automatically redirect anywhere — the unmatched path stays put', async () => {
    await renderAt('/una-ruta-que-no-existe')

    expect(router.state.location.pathname).toBe('/una-ruta-que-no-existe')
  })

  it('displays no raw technical information', async () => {
    await renderAt('/una-ruta-que-no-existe')

    expect(
      screen.queryByText(/TypeError|ReferenceError|stack|technical_message/i),
    ).not.toBeInTheDocument()
  })
})

describe('/panel renders the captain dashboard UI inside AppShell', () => {
  it('renders the AppShell chrome and the captain dashboard content at /panel', async () => {
    await renderAt('/panel')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(await screen.findByText('Próximos eventos')).toBeInTheDocument()
  })

  it('does not register an /panel/:id event-detail or live-operation route', async () => {
    await renderAt('/panel/dashboard-evento-demo-1')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

describe('/eventos renders the real events UI inside AppShell', () => {
  it('renders the AppShell chrome and the events list content at /eventos', async () => {
    await renderAt('/eventos')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByText('Consulta y filtra los eventos registrados.'),
    ).toBeInTheDocument()
  })

  it('registers /eventos/nuevo as the real event-creation page (feature/event-lifecycle-management), not /eventos/:id', async () => {
    await renderAt('/eventos/nuevo')

    // No longer matched by /eventos/:id's `parseEventId` unavailable
    // state — "nuevo" is now a real, static sibling route.
    expect(
      screen.queryByText('No encontramos el evento solicitado.'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Crear evento' })).toBeInTheDocument()
    expect(await screen.findByLabelText(/^Título/)).toBeInTheDocument()
  })
})

describe('/eventos/:id renders the Event Detail UI inside AppShell', () => {
  it('renders the AppShell chrome and the event detail content for a known event id', async () => {
    await renderAt('/eventos/1001')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    // The detail content itself now loads through TanStack Query
    // (`feature/event-detail-live-integration`) — `findByRole` awaits the
    // mocked `GET /eventos/1001` resolving instead of asserting mid-fetch.
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Evento de demostración — boda',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the Topbar h1 as "Eventos" (not the generic SGEB fallback) for the nested detail route', async () => {
    await renderAt('/eventos/1001')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id, not a routing error', async () => {
    await renderAt('/eventos/not-a-number')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id the backend does not recognize, not a redirect', async () => {
    await renderAt('/eventos/999999')

    // SGEB-3001 (not found) is a rejected, awaited query — `findByText`
    // waits for it to settle instead of asserting mid-fetch.
    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/eventos/999999')
  })

  it('does not register /eventos/:id/editar', async () => {
    await renderAt('/eventos/1001/editar')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

describe('/eventos/:id/equipo renders the Team Selection UI inside AppShell', () => {
  it('renders the AppShell chrome and the team selection content for a known fixture id', async () => {
    await renderAt('/eventos/1001/equipo')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    // The roster now loads through TanStack Query
    // (`feature/team-selection-live-integration`) — `findByRole` awaits the
    // mocked `GET /eventos/1001` and `GET /eventos/1001/participaciones`
    // resolving instead of asserting mid-fetch.
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Selección de equipo' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the Topbar h1 as "Eventos" for the nested team-selection route', async () => {
    await renderAt('/eventos/1001/equipo')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', async () => {
    await renderAt('/eventos/not-a-number/equipo')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('/eventos/:id still works — is not shadowed by the equipo child route', async () => {
    await renderAt('/eventos/1001')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Evento de demostración — boda',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Selección de equipo' }),
    ).not.toBeInTheDocument()
  })
})

describe('/eventos/:id/pase-de-lista renders the Event Attendance UI inside AppShell', () => {
  it('renders the AppShell chrome and the attendance content for a known fixture id', async () => {
    await renderAt('/eventos/1001/pase-de-lista')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Pase de lista' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the Topbar h1 as "Eventos" for the nested attendance route', async () => {
    await renderAt('/eventos/1001/pase-de-lista')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', async () => {
    await renderAt('/eventos/not-a-number/pase-de-lista')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', async () => {
    await renderAt('/eventos/999999/pase-de-lista')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('/eventos/:id still works — is not shadowed by the pase-de-lista child route', async () => {
    await renderAt('/eventos/1001')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Evento de demostración — boda',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Pase de lista' }),
    ).not.toBeInTheDocument()
  })

  it('/eventos/:id/equipo still works — is not shadowed by the pase-de-lista sibling route', async () => {
    await renderAt('/eventos/1001/equipo')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Selección de equipo' }),
    ).toBeInTheDocument()
  })

  it('/eventos/:id/cubaitor now renders the real Event Cubaitor UI, not a 404 (feature/cubaitor-orders-live)', async () => {
    await renderAt('/eventos/1001/cubaitor')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Barra — Bebidas y Cubaitor',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })
})

describe('/eventos/:id/montaje renders the Event Montage UI inside AppShell', () => {
  it('renders the AppShell chrome and the montage content for a known fixture id', async () => {
    await renderAt('/eventos/1001/montaje')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    // The roster/checklist now load through TanStack Query
    // (`feature/montage-live-integration`) — `findByRole` awaits the mocked
    // `GET /eventos/1001`, `GET /eventos/1001/participaciones`, and
    // `GET /checklists` resolving instead of asserting mid-fetch.
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Montaje y asignación de mesas',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the Topbar h1 as "Eventos" for the nested montage route', async () => {
    await renderAt('/eventos/1001/montaje')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', async () => {
    await renderAt('/eventos/not-a-number/montaje')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', async () => {
    await renderAt('/eventos/999999/montaje')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('/eventos/:id still works — is not shadowed by the montaje child route', async () => {
    await renderAt('/eventos/1001')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Evento de demostración — boda',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Montaje y asignación de mesas' }),
    ).not.toBeInTheDocument()
  })

  it('/eventos/:id/pase-de-lista still works — is not shadowed by the montaje sibling route', async () => {
    await renderAt('/eventos/1001/pase-de-lista')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Pase de lista' }),
    ).toBeInTheDocument()
  })

  it('/eventos/:id/cubaitor now renders the real Event Cubaitor UI, not a 404 (feature/cubaitor-orders-live)', async () => {
    await renderAt('/eventos/1001/cubaitor')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Barra — Bebidas y Cubaitor',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })
})

describe('/eventos/:id/operacion-en-vivo renders the Live Operations UI inside AppShell', () => {
  it('renders the AppShell chrome and the live operations content for a known fixture id', async () => {
    await renderAt('/eventos/1001/operacion-en-vivo')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Control de salida' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the Topbar h1 as "Eventos" for the nested live-operations route', async () => {
    await renderAt('/eventos/1001/operacion-en-vivo')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', async () => {
    await renderAt('/eventos/not-a-number/operacion-en-vivo')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', async () => {
    await renderAt('/eventos/999999/operacion-en-vivo')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('/eventos/:id still works — is not shadowed by the operacion-en-vivo child route', async () => {
    await renderAt('/eventos/1001')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Evento de demostración — boda',
      }),
    ).toBeInTheDocument()
    // Event Detail's own grouped navigation legitimately has an "Operación
    // en vivo" group heading — what must NOT leak in from the child route
    // is its "Control de salida" page heading (the renamed participant-exit
    // screen this route shadowing check originally guarded against).
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Control de salida' }),
    ).not.toBeInTheDocument()
  })

  it('/eventos/:id/montaje still works — is not shadowed by the operacion-en-vivo sibling route', async () => {
    await renderAt('/eventos/1001/montaje')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Montaje y asignación de mesas',
      }),
    ).toBeInTheDocument()
  })

  it('does not register a duplicate /eventos/:id/vivo alias route', async () => {
    await renderAt('/eventos/1001/vivo')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

describe('/eventos/:id/panel-operativo renders the Event Dashboard UI inside AppShell', () => {
  it('renders the AppShell chrome and the dashboard content for a known fixture id', async () => {
    await renderAt('/eventos/1001/panel-operativo')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Evento de demostración — boda',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', async () => {
    await renderAt('/eventos/not-a-number/panel-operativo')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })
})

describe('/eventos/:id/solicitudes renders the Service Requests UI inside AppShell', () => {
  it('renders the AppShell chrome and the service-requests content for a known fixture id', async () => {
    await renderAt('/eventos/1001/solicitudes')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Solicitudes de mesa' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })
})

describe('/eventos/:id/cierre renders the Event Closure UI inside AppShell', () => {
  it('renders the AppShell chrome and the closure content for a known fixture id', async () => {
    await renderAt('/eventos/1001/cierre')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Cierre del evento' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the Topbar h1 as "Eventos" for the nested closure route', async () => {
    await renderAt('/eventos/1001/cierre')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', async () => {
    await renderAt('/eventos/not-a-number/cierre')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', async () => {
    await renderAt('/eventos/999999/cierre')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('/eventos/:id still works — is not shadowed by the cierre child route', async () => {
    await renderAt('/eventos/1001')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Evento de demostración — boda',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Cierre del evento' }),
    ).not.toBeInTheDocument()
  })

  it('/eventos/:id/montaje still works — is not shadowed by the cierre sibling route', async () => {
    await renderAt('/eventos/1001/montaje')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Montaje y asignación de mesas',
      }),
    ).toBeInTheDocument()
  })

  it('does not register /eventos/:id/bebidas — W-08 remains deferred', async () => {
    await renderAt('/eventos/1001/bebidas')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

describe('/eventos/:id/pagos renders the Event Payments UI inside AppShell', () => {
  it('renders the AppShell chrome and the payments content for a known fixture id', async () => {
    await renderAt('/eventos/3001/pagos')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Pagos' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the Topbar h1 as "Eventos" for the nested payments route', async () => {
    await renderAt('/eventos/3001/pagos')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', async () => {
    await renderAt('/eventos/not-a-number/pagos')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', async () => {
    await renderAt('/eventos/999999/pagos')

    expect(
      await screen.findByText('No encontramos el evento solicitado.'),
    ).toBeInTheDocument()
  })

  it('/eventos/:id still works — is not shadowed by the pagos child route', async () => {
    await renderAt('/eventos/3001')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Evento de demostración — aniversario finalizado',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Pagos' }),
    ).not.toBeInTheDocument()
  })

  it('/eventos/:id/cierre still works — is not shadowed by the pagos sibling route', async () => {
    await renderAt('/eventos/3001/cierre')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Cierre del evento' }),
    ).toBeInTheDocument()
  })

  it('/eventos/:id/equipo still works', async () => {
    await renderAt('/eventos/1001/equipo')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Selección de equipo' }),
    ).toBeInTheDocument()
  })

  it('/eventos/:id/pase-de-lista still works', async () => {
    await renderAt('/eventos/1001/pase-de-lista')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Pase de lista' }),
    ).toBeInTheDocument()
  })

  it('/eventos/:id/montaje still works', async () => {
    await renderAt('/eventos/1001/montaje')

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Montaje y asignación de mesas',
      }),
    ).toBeInTheDocument()
  })

  it('does not register /eventos/:id/bebidas — W-08 remains deferred', async () => {
    await renderAt('/eventos/3001/bebidas')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

describe('/meseros renders the real waiters UI inside AppShell', () => {
  it('renders the AppShell chrome and the waiters list content at /meseros', async () => {
    await renderAt('/meseros')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByText('Consulta y filtra el directorio de meseros.'),
    ).toBeInTheDocument()
  })

  it('does not register /meseros/:id — no waiter detail route is approved even as "Proposed"', async () => {
    await renderAt('/meseros/mesero-demo-1')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('does not register /meseros/invitar', async () => {
    await renderAt('/meseros/invitar')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('does not register /meseros/nuevo', async () => {
    await renderAt('/meseros/nuevo')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

describe('/reportes renders the real event-scoped reports UI inside AppShell', () => {
  it('renders the AppShell chrome and the reports content at /reportes', async () => {
    await renderAt('/reportes')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    // `ReportsPageHeader`'s subtitle is static — rendered regardless of the
    // real `GET /eventos` query's loading/error/success state, same
    // reasoning `/panel`'s own route test above uses `findByText`.
    expect(
      await screen.findByText(
        'Reportes reales del sistema, organizados por evento y, por separado, por personal.',
      ),
    ).toBeInTheDocument()
  })

  it('does not register /reportes/exportar', async () => {
    await renderAt('/reportes/exportar')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('does not register /reportes/merma — event-specific merma is a separate, out-of-scope feature', async () => {
    await renderAt('/reportes/merma')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('does not register /reportes/pagos — event-specific payments are a separate, out-of-scope feature', async () => {
    await renderAt('/reportes/pagos')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('does not register a /reportes/meseros/:uuid waiter-detail route', async () => {
    await renderAt('/reportes/meseros/b2c3d4e5-f6a7-4b1c-8d2e-000000000001')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

describe('/publico/mesas/:codigoQr renders the anonymous public diner experience', () => {
  it('renders the public diner page, with no AppShell chrome', async () => {
    await renderAt('/publico/mesas/a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

    expect(
      await screen.findByRole('button', { name: 'Llamar al mesero' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
  })

  it('renders no AuthLayout content for the public diner route', async () => {
    await renderAt('/publico/mesas/a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

    await screen.findByRole('button', { name: 'Llamar al mesero' })
    expect(
      screen.queryByRole('heading', { name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument()
  })

  it('does not register /publico/mesas without a codigoQr — falls through to not-found', async () => {
    await renderAt('/publico/mesas')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('does not register /publico/mesas/:codigoQr/calificar as a separate route', async () => {
    await renderAt('/publico/mesas/a1b2c3d4-e5f6-4a1b-8c2d-000000000099/calificar')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('does not register a bare /publico or /publico/mesas index route', async () => {
    await renderAt('/publico')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

describe('/auth/callback renders the OIDC callback page outside AppShell and AuthLayout', () => {
  it('is registered and renders its own heading, not a not-found page', async () => {
    await renderAt('/auth/callback')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Verificando tu inicio de sesión' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).not.toBeInTheDocument()
  })

  it('renders with no AppShell chrome', async () => {
    await renderAt('/auth/callback')

    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('exposes no Auth provider form (no login/2FA/recovery UI)', async () => {
    await renderAt('/auth/callback')

    expect(
      screen.queryByRole('heading', { name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /correo/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument()
  })

  it('does not register /callback as an alias', async () => {
    await renderAt('/callback')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

/**
 * Router-level coverage for the private authentication route boundary
 * (`feature/private-route-guard`) — proves the protection exists at the
 * actual routing/layout composition (`AppShellLayout` as the parent
 * element of every private child route), not merely that an isolated
 * component can conditionally render children. Real feature-page content
 * (`CaptainDashboardPage`'s "Próximos eventos" section heading, the events list copy) is
 * used as the private-content marker, exactly as the rest of this file
 * already does.
 */
describe('Private route boundary — authentication guard', () => {
  it('does not render private content while the session is idle/restoring', async () => {
    useOidcSessionStore.getState().reset()
    vi.spyOn(bootstrapModule, 'bootstrapSession').mockReturnValue(
      new Promise(() => undefined),
    )

    await renderAt('/panel')

    expect(screen.queryByText('Próximos eventos')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders private content once the session is authenticated', async () => {
    await renderAt('/panel')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Próximos eventos')).toBeInTheDocument()
  })

  it('on a definitively anonymous session, never renders private content and starts visible authorization exactly once', async () => {
    useOidcSessionStore.getState().setAnonymous()
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')

    await renderAt('/eventos')

    await waitFor(() => {
      expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    })
    expect(mockedBeginAuthorization).toHaveBeenCalledWith({ returnTo: '/eventos' })
    expect(
      screen.queryByText('Consulta y filtra los eventos registrados.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
  })

  it('does not start a second visible authorization on a later re-render while still anonymous (no redirect loop)', async () => {
    useOidcSessionStore.getState().setAnonymous()
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')

    const { rerender } = await renderAt('/panel')
    await waitFor(() => {
      expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    })

    rerender(<RouterProvider router={router} />)

    expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
  })

  it('does not restart bootstrap or trigger visible authorization when navigating between private routes while already authenticated', async () => {
    const bootstrapSpy = vi.spyOn(bootstrapModule, 'bootstrapSession')

    await renderAt('/panel')
    await renderAt('/eventos')
    await renderAt('/reportes')

    expect(bootstrapSpy).not.toHaveBeenCalled()
    expect(mockedBeginAuthorization).not.toHaveBeenCalled()
  })

  it('stops exposing private content once an authenticated session resets to anonymous (no local resurrection)', async () => {
    mockedBeginAuthorization.mockResolvedValue('https://auth.sgeb.mediocres.mx/authorize')

    await renderAt('/panel')
    expect(await screen.findByText('Próximos eventos')).toBeInTheDocument()

    act(() => {
      useOidcSessionStore.getState().setAnonymous()
    })

    expect(screen.queryByText('Próximos eventos')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(mockedBeginAuthorization).toHaveBeenCalledOnce()
    })
  })

  it('does not invoke the private OIDC bootstrap for the public Diner route', async () => {
    useOidcSessionStore.getState().reset()
    const bootstrapSpy = vi.spyOn(bootstrapModule, 'bootstrapSession')

    await renderAt('/publico/mesas/a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

    expect(bootstrapSpy).not.toHaveBeenCalled()
    expect(useOidcSessionStore.getState().session.status).toBe('idle')
  })

  it('/auth/callback remains reachable and unguarded even with an anonymous session', async () => {
    useOidcSessionStore.getState().setAnonymous()

    await renderAt('/auth/callback')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Verificando tu inicio de sesión' }),
    ).toBeInTheDocument()
  })
})
