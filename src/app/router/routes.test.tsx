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

const DETAIL_RECORD_1001: EventoApiRecord = {
  id_evento: 1001,
  id_salon: 1,
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
      return Promise.reject(
        new SgebApplicationError(404, {
          code: 'SGEB-3001',
          message: 'No encontramos la información solicitada.',
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

describe('public auth routes render outside AppShell, using AuthLayout', () => {
  it('renders /login', async () => {
    await renderAt('/login')

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('renders /verificacion-2fa with the no-active-verification fallback on direct navigation', async () => {
    await renderAt('/verificacion-2fa')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Verificación en dos pasos' }),
    ).toBeInTheDocument()
    expect(screen.getByText('No hay una verificación en curso')).toBeInTheDocument()
  })

  it('renders /recuperar', async () => {
    await renderAt('/recuperar')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Recuperar acceso' }),
    ).toBeInTheDocument()
  })

  it('renders /recuperar/:token without exposing the token anywhere', async () => {
    await renderAt('/recuperar/un-token-de-prueba')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Crea una nueva contraseña' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('un-token-de-prueba')).not.toBeInTheDocument()
  })
})

describe('existing routes remain available', () => {
  it('still renders the design-system preview at /', async () => {
    await renderAt('/')

    expect(screen.getByText('SGEB frontend foundation is running')).toBeInTheDocument()
  })

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
    expect(screen.getByText('Resumen de eventos')).toBeInTheDocument()
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

  it('does not register /eventos/nuevo — the slug is only "Proposed", not confirmed', async () => {
    await renderAt('/eventos/nuevo')

    // Now matched by /eventos/:id (feature/event-detail-ui-foundation) —
    // "nuevo" fails parseEventId's positive-integer check, so this
    // renders the Event Detail feature's own unavailable state, not the
    // global catch-all NotFoundPage. Either way, it is never a real
    // creation page.
    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear evento' })).not.toBeInTheDocument()
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
    expect(
      screen.getByRole('heading', { level: 2, name: 'Selección de equipo' }),
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
      screen.getByRole('heading', { level: 2, name: 'Pase de lista' }),
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

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
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
      screen.getByRole('heading', { level: 2, name: 'Selección de equipo' }),
    ).toBeInTheDocument()
  })

  it('does not register /eventos/:id/cubaitor', async () => {
    await renderAt('/eventos/1001/cubaitor')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

describe('/eventos/:id/montaje renders the Event Montage UI inside AppShell', () => {
  it('renders the AppShell chrome and the montage content for a known fixture id', async () => {
    await renderAt('/eventos/1001/montaje')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Montaje y asignación de mesas' }),
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

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
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
      screen.getByRole('heading', { level: 2, name: 'Pase de lista' }),
    ).toBeInTheDocument()
  })

  it('does not register /eventos/:id/cubaitor', async () => {
    await renderAt('/eventos/1001/cubaitor')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
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
      screen.getByRole('heading', { level: 2, name: 'Cierre del evento' }),
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

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
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
      screen.getByRole('heading', { level: 2, name: 'Montaje y asignación de mesas' }),
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
    expect(screen.getByRole('heading', { level: 2, name: 'Pagos' })).toBeInTheDocument()
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

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
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
      screen.getByRole('heading', { level: 2, name: 'Cierre del evento' }),
    ).toBeInTheDocument()
  })

  it('/eventos/:id/equipo still works', async () => {
    await renderAt('/eventos/1001/equipo')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Selección de equipo' }),
    ).toBeInTheDocument()
  })

  it('/eventos/:id/pase-de-lista still works', async () => {
    await renderAt('/eventos/1001/pase-de-lista')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Pase de lista' }),
    ).toBeInTheDocument()
  })

  it('/eventos/:id/montaje still works', async () => {
    await renderAt('/eventos/1001/montaje')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Montaje y asignación de mesas' }),
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

describe('/reportes renders the real waiter-performance report UI inside AppShell', () => {
  it('renders the AppShell chrome and the report content at /reportes', async () => {
    await renderAt('/reportes')

    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
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

    expect(screen.getByRole('button', { name: 'Llamar al mesero' })).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
  })

  it('renders no AuthLayout content for the public diner route', async () => {
    await renderAt('/publico/mesas/a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

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
 * (`CaptainDashboardPage`'s "Resumen de eventos", the events list copy) is
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

    expect(screen.queryByText('Resumen de eventos')).not.toBeInTheDocument()
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
    expect(screen.getByText('Resumen de eventos')).toBeInTheDocument()
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
    expect(screen.getByText('Resumen de eventos')).toBeInTheDocument()

    act(() => {
      useOidcSessionStore.getState().setAnonymous()
    })

    expect(screen.queryByText('Resumen de eventos')).not.toBeInTheDocument()
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

  it('does not invoke the private OIDC bootstrap for /login', async () => {
    useOidcSessionStore.getState().reset()
    const bootstrapSpy = vi.spyOn(bootstrapModule, 'bootstrapSession')

    await renderAt('/login')

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
