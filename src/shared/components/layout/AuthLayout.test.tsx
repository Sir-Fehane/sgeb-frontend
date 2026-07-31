import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AuthLayout } from '@/shared/components/layout/AuthLayout'

describe('AuthLayout', () => {
  it('renders a single main landmark with the page heading and no sidebar/topbar chrome', () => {
    render(
      <AuthLayout title="Iniciar sesión" description="Panel del Capitán">
        <p>Contenido del formulario</p>
      </AuthLayout>,
    )

    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Panel del Capitán')).toBeInTheDocument()
    expect(screen.getByText('Contenido del formulario')).toBeInTheDocument()

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('omits the description when none is supplied', () => {
    render(
      <AuthLayout title="Recuperar acceso">
        <p>Formulario</p>
      </AuthLayout>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Recuperar acceso' }),
    ).toBeInTheDocument()
  })

  it('renders an optional footer navigation area', () => {
    render(
      <AuthLayout title="Crea una nueva contraseña" footer={<a href="/login">Volver</a>}>
        <p>Formulario</p>
      </AuthLayout>,
    )

    expect(screen.getByRole('link', { name: 'Volver' })).toBeInTheDocument()
  })
})
