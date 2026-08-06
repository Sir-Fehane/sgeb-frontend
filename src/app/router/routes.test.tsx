import { render, screen } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { router } from '@/app/router/routes'

async function renderAt(path: string) {
  await router.navigate(path)
  return render(<RouterProvider router={router} />)
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

    // Falls through to the catch-all NotFoundPage, not a real creation page.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear evento' })).not.toBeInTheDocument()
  })

  it('does not register an /eventos/:id detail route', async () => {
    await renderAt('/eventos/1001')

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
