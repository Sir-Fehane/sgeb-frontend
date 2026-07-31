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
