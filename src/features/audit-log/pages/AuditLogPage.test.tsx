import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuditLogPage } from '@/features/audit-log/pages/AuditLogPage'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import type { OidcRole } from '@/features/oidc-client/types/userInfo'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  useOidcSessionStore.getState().reset()
})

function authenticate(rol: OidcRole) {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: {
      sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Test User',
      email: 'test@example.com',
      rol,
    },
  })
}

function envelope(data: unknown) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

const ENTRY = {
  id_bitacora: 1,
  tipo_entidad: 'USUARIO',
  id_entidad: 42,
  accion: 'actualizar',
  uuid_usuario_responsable: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  detalle: 'estado borrador → confirmado',
  timestamp: '2026-08-20T10:00:00Z',
}

function mockAuditLogRequests(items: unknown[] = [ENTRY]) {
  vi.mocked(requestSgeb).mockImplementation((config) => {
    if (config.url === '/admin/bitacora') {
      return Promise.resolve(
        envelope({
          items,
          meta: { page: 1, page_size: 20, total: items.length, last_page: 1 },
        }),
      )
    }
    return Promise.reject(new Error(`Unexpected request: ${String(config.url)}`))
  })
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuditLogPage />
    </QueryClientProvider>,
  )
}

describe('AuditLogPage — admin session', () => {
  it('loads the real audit log and renders human-readable action/entity-type labels, not raw enum values', async () => {
    authenticate('admin')
    mockAuditLogRequests()

    renderPage()

    expect(await screen.findByText('estado borrador → confirmado')).toBeInTheDocument()
    const row = screen.getByRole('row', { name: /estado borrador → confirmado/ })
    expect(within(row).getByText('Actualización')).toBeInTheDocument()
    expect(within(row).getByText('Usuario')).toBeInTheDocument()
    const call = vi
      .mocked(requestSgeb)
      .mock.calls.find(([config]) => config.url === '/admin/bitacora')
    expect(call?.[0].params).toMatchObject({ page: 1, pageSize: 20 })
  })

  it('shows the empty state when there are genuinely no movements for the selected filters', async () => {
    authenticate('admin')
    mockAuditLogRequests([])

    renderPage()

    expect(
      await screen.findByText(
        'No hay movimientos que coincidan con los filtros actuales.',
      ),
    ).toBeInTheDocument()
  })

  it('sends the real camelCase accion filter param when the Acción select changes', async () => {
    authenticate('admin')
    mockAuditLogRequests()
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('estado borrador → confirmado')
    await user.selectOptions(screen.getByLabelText('Acción'), 'actualizar')

    await waitFor(() => {
      const call = vi
        .mocked(requestSgeb)
        .mock.calls.find(
          ([config]) =>
            config.url === '/admin/bitacora' &&
            (config.params as { accion?: string } | undefined)?.accion === 'actualizar',
        )
      expect(call).toBeDefined()
      expect(call?.[0].params).toMatchObject({ accion: 'actualizar', page: 1 })
    })
  })
})

describe('AuditLogPage — non-admin session', () => {
  it('never fires GET /admin/bitacora for a capitán session — shows the forbidden state instead', async () => {
    authenticate('capitan')

    renderPage()

    expect(
      await screen.findByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
  })

  it('never fires the request before a session is authenticated', () => {
    renderPage()

    expect(
      screen.getByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
  })
})
