import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ChecklistsPage } from '@/features/checklists/pages/ChecklistsPage'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

function authenticate(rol: 'admin' | 'capitan' | 'mesero') {
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

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  useOidcSessionStore.getState().reset()
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ChecklistsPage />
    </QueryClientProvider>,
  )
}

describe('ChecklistsPage', () => {
  it('renders the template catalog for a capitán session and fetches it', async () => {
    authenticate('capitan')
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'sin resultados' },
      data: [],
    })

    renderPage()

    expect(
      await screen.findByText('No hay plantillas de checklist registradas todavía.'),
    ).toBeInTheDocument()
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/checklists' }),
    )
  })

  it('renders the template catalog for an admin session', async () => {
    authenticate('admin')
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'sin resultados' },
      data: [],
    })

    renderPage()

    expect(await screen.findByText('Nueva plantilla')).toBeInTheDocument()
  })

  it('shows the forbidden state, and never fetches the catalog, for a mesero session', async () => {
    authenticate('mesero')
    vi.mocked(requestSgeb).mockImplementation((config) =>
      Promise.reject(new Error(`Unexpected request: ${String(config.url)}`)),
    )

    renderPage()

    expect(
      await screen.findByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument()
    expect(requestSgeb).not.toHaveBeenCalled()
  })
})
