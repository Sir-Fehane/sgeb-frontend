import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { RouteErrorBoundary } from '@/features/route-errors/components/RouteErrorBoundary'

/**
 * Test-only router with deliberately throwing routes — never registered
 * in the real application router (`src/app/router/routes.tsx`). Exists
 * solely to exercise `RouteErrorBoundary`'s three documented outcomes.
 */
function renderTestRouterAt(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/throws-error',
        errorElement: <RouteErrorBoundary />,
        Component: () => {
          throw new Error('boom — a raw message that must never reach the user')
        },
      },
      {
        path: '/throws-404-response',
        errorElement: <RouteErrorBoundary />,
        loader: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- idiomatic React Router loader pattern: throwing a Response
          throw new Response('Not found', { status: 404, statusText: 'Not Found' })
        },
        Component: () => null,
      },
      {
        path: '/throws-500-response',
        errorElement: <RouteErrorBoundary />,
        loader: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- idiomatic React Router loader pattern: throwing a Response
          throw new Response('Internal error', { status: 500 })
        },
        Component: () => null,
      },
      {
        path: '/throws-unknown-value',
        errorElement: <RouteErrorBoundary />,
        loader: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- deliberately simulating a non-Error thrown value
          throw 'a plain string thrown value, not an Error'
        },
        Component: () => null,
      },
      {
        path: '/panel',
        Component: () => <div>Panel de prueba</div>,
      },
    ],
    { initialEntries: [initialPath] },
  )
  return render(<RouterProvider router={router} />)
}

describe('RouteErrorBoundary', () => {
  it('renders the generic unexpected-error presentation for a thrown Error, never the raw message', () => {
    renderTestRouterAt('/throws-error')

    expect(
      screen.getByRole('heading', { level: 1, name: 'No pudimos abrir esta página' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/boom — a raw message that must never reach the user/),
    ).not.toBeInTheDocument()
  })

  it('renders the not-found presentation for a thrown 404 route response', async () => {
    renderTestRouterAt('/throws-404-response')

    // Loader errors resolve asynchronously (unlike a synchronous render
    // throw), so the error boundary isn't painted on the very first tick.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('renders the generic unexpected-error presentation for a non-404 route response, never inventing authorization behavior', async () => {
    renderTestRouterAt('/throws-500-response')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No pudimos abrir esta página',
      }),
    ).toBeInTheDocument()
  })

  it('renders a safe generic error for an unknown (non-Error) thrown value', async () => {
    renderTestRouterAt('/throws-unknown-value')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No pudimos abrir esta página',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/a plain string thrown value/)).not.toBeInTheDocument()
  })

  it('always offers real navigation back to /panel', () => {
    renderTestRouterAt('/throws-error')

    expect(screen.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute(
      'href',
      '/panel',
    )
  })

  it('never redirects to /login', () => {
    renderTestRouterAt('/throws-error')

    expect(
      screen.queryByRole('heading', { name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument()
  })
})
