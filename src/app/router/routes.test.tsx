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

  it('still falls back to NotFoundPage for an unknown path', async () => {
    await renderAt('/una-ruta-que-no-existe')

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
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
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear evento' })).not.toBeInTheDocument()
  })

  it('does not register an /eventos/:id detail route', async () => {
    await renderAt('/eventos/1001')

    expect(screen.getByText('404')).toBeInTheDocument()
  })
})
