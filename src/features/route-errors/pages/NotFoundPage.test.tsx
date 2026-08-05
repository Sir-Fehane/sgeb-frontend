import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { NotFoundPage } from '@/features/route-errors/pages/NotFoundPage'

describe('NotFoundPage', () => {
  it('renders one clear heading explaining the page could not be found', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('No encontramos la página que buscas.')).toBeInTheDocument()
  })

  it('provides a real recovery action to /panel', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute(
      'href',
      '/panel',
    )
  })

  it('never renders a link to /login', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole('link', { name: /iniciar sesión/i }),
    ).not.toBeInTheDocument()
  })

  it('never claims the user lacks permission', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText(/permiso|no autorizado|acceso denegado/i),
    ).not.toBeInTheDocument()
  })
})
