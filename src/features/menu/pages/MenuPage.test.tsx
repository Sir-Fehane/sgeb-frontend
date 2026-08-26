import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { MenuPage } from '@/features/menu/pages/MenuPage'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

function envelopeList(data: unknown[]) {
  return {
    result: { code: data.length ? 'SGEB-0000' : 'SGEB-0002', message: 'ok' },
    data,
  }
}

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
      <MenuPage />
    </QueryClientProvider>,
  )
}

describe('MenuPage', () => {
  it('renders the Bebidas tab for a capitán session and fetches the catalog', async () => {
    authenticate('capitan')
    vi.mocked(requestSgeb).mockImplementation((config) => {
      if (config.url === '/bebidas') return Promise.resolve(envelopeList([]))
      if (config.url === '/insumos') return Promise.resolve(envelopeList([]))
      return Promise.reject(new Error(`Unexpected request: ${String(config.url)}`))
    })

    renderPage()

    expect(await screen.findByText('Bebidas y Cubaitor')).toBeInTheDocument()
    expect(requestSgeb).toHaveBeenCalledWith(expect.objectContaining({ url: '/bebidas' }))
  })

  it('shows the forbidden state, and never fetches any catalog endpoint, for a mesero session — this web console is not the mesero product (native iOS app)', async () => {
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
